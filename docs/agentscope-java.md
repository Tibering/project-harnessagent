# AgentScope Java 2.0 摘要（本项目版）

> 来源：官方文档 <https://java.agentscope.io>（v2.0.4，抓取于 2026-11-24）。
> 只记录本项目会用到的部分；API 细节以官方文档为准，升级版本时先复核本文。

## 1. 版本与依赖

- 要求 **JDK 17+**、Maven 3.9+；本项目用 Java 21，满足。
- 核心坐标（`${agentscope.version}` 当前为 `2.0.4`）：

| 用途 | 坐标 |
|---|---|
| Harness 全套（含 core，推荐入口） | `io.agentscope:agentscope-harness` |
| 只用 ReActAgent | `io.agentscope:agentscope-core` |
| DashScope 模型 | `io.agentscope:agentscope-extensions-model-dashscope` |
| RAG（reader/chunker/embedding/store） | `io.agentscope:agentscope-extensions-rag-simple` |

- 框架无关的纯 Java 库，可直接放进 Spring Boot；内部用 Reactor（`Mono`/`Flux`），与 Spring MVC 混用时要自己切线程/桥接。
- 模型用字符串 id 交给 `ModelRegistry` 解析，形如 `dashscope:qwen-plus`、`openai:gpt-5.5`、`deepseek:deepseek-v4-flash`、`ollama:llama3`，对应环境变量 `DASHSCOPE_API_KEY` / `OPENAI_API_KEY` 等。

## 2. Agent 核心

```java
HarnessAgent agent = HarnessAgent.builder()
    .name("assistant")
    .sysPrompt("...")
    .model("dashscope:qwen-plus")
    .workspace(Paths.get(".agentscope/workspace"))
    .build();

Msg reply = agent.call(new UserMessage("hi"), RuntimeContext.builder()
    .userId("alice").sessionId("s-1").build()).block();
```

- `Agent` 接口 = `CallableAgent` + `StreamableAgent` + `ObservableAgent`：
  - `call(msgs, ctx)` → `Mono<Msg>`（内部消费事件，返回最终消息）
  - `streamEvents(msgs, ctx)` → `Flux<AgentEvent>`（流式，供 SSE 用）
  - `observe(msg)` → 只写上下文、不触发推理
  - `prepareRun` / `prepareCall` → `AgentRun`，可 `cancel()` / `interrupt()` / `status()`
- `ReActAgent` 是默认实现；`HarnessAgent` 是其薄包装，额外提供 workspace、长期记忆、压缩、subagent、sandbox、Plan Mode。
- 单例即可服务多用户：agent 本身**无状态**，会话状态按 `(userId, sessionId)` 隔离；同一对串行、不同对并行。
- 模型容错：`.maxRetries(n)`、`.fallbackModel("dashscope:qwen-max")`、`.failoverListener(...)`。

### 消息与内容块

- `Msg`：`role`（USER/ASSISTANT/SYSTEM/TOOL）、有序 `List<ContentBlock>`、`usage`、`generateReason`。
- 内容块：`TextBlock`、`DataBlock`（base64/URL）、`DocumentBlock`（file_id/URL/base64）、`ImageBlock`/`AudioBlock`/`VideoBlock`（旧）、`ThinkingBlock`、`ToolUseBlock`、`ToolResultBlock`、`HintBlock`。
- 取值：`getTextContent()`、`getContentBlocks(Class)`、`getFirstContentBlock(Class)`。
- 结构化输出：`call(msgs, MyRecord.class, ctx)` + `msg.getStructuredData(...)`。

### 事件（SSE 的原料）

事件按 `replyId` 归组；块内用 `blockId`、工具用 `toolCallId` 关联，遵循 **start → delta → end**：

| 阶段 | 事件 |
|---|---|
| 生命周期 | `AgentStartEvent` / `AgentEndEvent` / `ExceedMaxItersEvent` / `RequestStopEvent` |
| 文本 | `TextBlockStartEvent` / `TextBlockDeltaEvent` / `TextBlockEndEvent` |
| 思考 | `ThinkingBlock*`（同上三段） |
| 工具调用 | `ToolCallStartEvent` / `ToolCallDeltaEvent` / `ToolCallEndEvent` |
| 工具结果 | `ToolResultStartEvent` / `ToolProgressEvent` / `ToolResultTextDeltaEvent` / `ToolResultDataDeltaEvent` / `ToolResultEndEvent` |
| 模型调用 | `ModelCallStartEvent` / `ModelCallEndEvent`（带 input/output tokens） |
| 人机确认 | `RequireUserConfirmEvent` / `ExternalExecutionResultEvent` / `AllToolsDeniedEvent` |
| 子 agent | `SubagentExposedEvent` |

设计稿里的 SSE 契约比这套粗。落地时要写一层映射，例如：

| 设计稿事件 | AgentScope 侧 |
|---|---|
| `session.start` | `AgentStartEvent`（或调用前本地构造） |
| `text.delta` | `TextBlockDeltaEvent.getDelta()` |
| `tool.call.start` | `ToolCallStartEvent` |
| `tool.result` | `ToolResultEndEvent` |
| `usage` | `ModelCallEndEvent` 的 token 数 / `Msg.getUsage()` |
| `done` | `AgentEndEvent` |

## 3. 状态与会话

- `AgentState`：上下文、压缩摘要、权限规则、任务列表、工具组、Plan Mode；由 `AgentStateStore` 持久化。
- 每次 `call` 入口按 `(userId, sessionId)` 载入、出口写回；**同一对串行**，不同对并行。
- 内置 store：`InMemoryAgentStateStore`（测试）、`JsonFileAgentStateStore`（Harness 默认，`~/.agentscope/state/<agentId>/`，单机）、`RedisAgentStateStore`（多副本）、`MysqlAgentStateStore`（关系库）。
- `RuntimeContext` 是**每次调用**的元数据袋：`userId`/`sessionId` 决定状态槽，其它属性（租户、request-id、业务 POJO）不进持久化。
- 中断：`agent.interrupt(userId, sessionId)` 在协作检查点停止并保存状态。
- 1.0 的 `Memory` 接口已废弃，新代码用 `AgentState.getContext()` + store。

## 4. RAG（与文件/知识库直接相关）

- 入口是 `io.agentscope.core.rag.Knowledge` 接口，装配到 Agent：

```java
ReActAgent agent = ReActAgent.builder()
    .model(model)
    .knowledge(knowledge)
    .ragMode(RAGMode.AGENTIC)   // STATIC / AGENTIC / NONE
    .build();
```

- 也可以把检索暴露成工具：`KnowledgeRetrievalTools` + `Toolkit.registerObject(...)`。
- 各实现：**Simple**（自管 embedding + 向量库）、Bailian、Dify、HayStack、RAGFlow。除 Simple 外都是**只读检索**，文档入库在对方平台完成。

### Simple（自建 RAG 的首选）

```java
EmbeddingModel embeddings = DashScopeTextEmbedding.builder()
    .apiKey(System.getenv("DASHSCOPE_API_KEY"))
    .modelName("text-embedding-v3")
    .dimensions(1024)
    .build();

VDBStoreBase store = PgVectorStore.builder() /* ... */ .build();

SimpleKnowledge knowledge = SimpleKnowledge.builder()
    .embeddingModel(embeddings)
    .embeddingStore(store)
    .build();

knowledge.addDocuments(docs).block();

List<Document> hits = knowledge.retrieve("问题",
    RetrieveConfig.builder().limit(5).scoreThreshold(0.5).build()).block();
```

- 内置 reader：`TextReader`、`PDFReader`（PDFBox）、`WordReader`、`ImageReader`、`TikaReader`（Tika 兜底）、`ExternalApiReader`（OCR/外部解析）。均产出 `List<Document>`。
- 分片：`TextChunker` + `SplitStrategy`。
- embedding：`DashScopeTextEmbedding`、`DashScopeMultiModalEmbedding`、`OpenAITextEmbedding`、`OllamaTextEmbedding`，自定义实现 `EmbeddingModel`。
- 向量库：`InMemoryStore`、`PgVectorStore`、`MilvusStore`、`QdrantStore`、`ElasticsearchStore`。
- `RetrieveConfig`：`limit`、`scoreThreshold`、`metadata` 过滤（多知识库隔离可能靠 metadata）。
- `SimpleKnowledge` 支持 `usageListener` 统计 embedding 用量；**不会**替你关闭共享的 embedding model。

## 5. 工具与扩展（按需）

- `Toolkit.registerTool(obj)` 反射注册 `@Tool` 方法；支持 MCP（`McpClientBuilder`）。
- Middleware 四个洋葱钩子：`onAgent` / `onReasoning` / `onActing` / `onModelCall` + `onSystemPrompt`。
- 权限系统：静态规则 + 工具分类 + 输入分析 → allow / approve / deny，配合 `RequireUserConfirmEvent` 做 HITL。
- Skill：Markdown 模块热加载；仓库实现有 Git / MySQL / PostgreSQL。

## 6. 本项目落地约定（待评审）

1. **聊天模块**用 `ReActAgent`（先不上 Harness 的 workspace 复杂度），singleton，`RuntimeContext` 传 `userId`/`sessionId`；SSE 由 `streamEvents` 映射到设计稿事件。
2. **状态**：开发用 `JsonFileAgentStateStore` 放 `~/.agentscope` 或 `deploy` 挂载目录，不进仓库；多副本再换 Redis。
3. **RAG**：优先 `agentscope-extensions-rag-simple` + `PgVectorStore`，避免自己维护向量表与相似度查询；解析/分片直接复用其 reader/chunker。
4. **文件管理**：仍由本系统存文件元数据、原始字节（本地目录）与摄取任务状态；向量与 chunk 的归属待 Q7 定。
5. 版本锁在 `pom.xml` 的 `<agentscope.version>`，升级前先读 [Release Notes](https://java.agentscope.io/v2/en/docs/others/release-notes.md)。

## 7. 待确认 / 风险

- `PgVectorStore` 的表结构与多知识库隔离方式（单表 + metadata 过滤？每库一张表？）——文档未写，需要读源码或实验确认。
- `SimpleKnowledge` 的删除/重建语义（删文件后向量如何回收）——文档未覆盖。
- AgentScope 2.0 与 1.x 有 API 破坏性变更（事件、权限、Middleware、Workspace），不要照抄 1.x 示例。
- 文档站有中英两版，路径 `/v2/zh/...`；`llms.txt` 可拿全量页面索引。

## 8. 官方入口

| 主题 | 链接 |
|---|---|
| 首页 / 快速开始 | <https://java.agentscope.io/v2/en/docs/quickstart> |
| Agent / 状态 | `.../building-blocks/agent.md`、`.../building-blocks/context.md` |
| 消息与事件 | `.../building-blocks/message-and-event.md` |
| 工具 / 中间件 / 权限 | `.../building-blocks/tool.md` 等 |
| RAG 总览 / Simple | `.../integration/rag/overview.md`、`.../integration/rag/simple.md` |
| 上生产 | `.../others/going-to-production.md` |
| 全量索引 | <https://java.agentscope.io/llms.txt> |
