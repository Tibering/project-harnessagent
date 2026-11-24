# 项目约定

## 回答页：本项目禁用 answer-me-with-html

本项目不调用 `answer-me-with-html` skill，回复只用文字。

- 全局 `AGENTS.md` 里的 `[answer-me-with-html always-on]` 规则在本项目不生效，以本文件为准。
- 不生成 HTML 页面，不调用 `am render`，不因"给出结论"而附带页面。
- 只有在用户当次明确要求出页面时才例外，此时写到 `docs/answers/`。
- `docs/answers/` 里已有的归档页面保留不动，不再新增。

## 结构与事实源

- `backend/` Spring Boot 3.5 / Java 21 / Maven；`frontend/` Vue 3 + Vite + TS（pnpm）；`deploy/` pg17 + pgvector 的 compose。
- 启动步骤与接口清单看 `README.md`；视觉规范看 `docs/design/frontend-style.md`（含例外登记表）。
- ADR 与设计稿可能滞后，和代码/配置冲突时以代码为准。
- 前端没有在用的组件库/表单库：`reka-ui`、`class-variance-authority` 只在依赖里、`src` 未引用；UI 组件在 `frontend/src/components/ui/` 手写。只有 eslint，没有 prettier。

## 命令

- 前端全量（与 CI 同序）：`cd frontend && pnpm lint && pnpm test && pnpm build`。
- 单个前端测试：`cd frontend && pnpm vitest run src/stores/nav.spec.ts`。
- 后端全量：`cd backend && mvn -B verify`；单个测试：`mvn -Dtest=ExperienceSessionTests test`。
- 后端集成测试会起 Testcontainers（`pgvector/pgvector:pg17`），**没有 Docker 会直接失败**；`disabledWithoutDocker` 只标在 `ApplicationTests` 上。
- 本地联调：`cd deploy && docker compose up -d` → 后端 `mvn spring-boot:run`（8090）→ 前端 `pnpm dev`（5173，`/api` 代理到 8090）。

## 后端

- 运行时所有接口都在 `/api` 下（servlet context-path），但 MockMvc 测试里的路径**不带** `/api`。
- 统一响应 `ApiResponse{code,message,data,traceId}`：成功是 HTTP 200 + `code:0`；失败用 HTTP 状态码 + 业务错误码；`data` 为 null 时该键不序列化。
- 身份是两个头 `X-User-Id` + `X-Session-Id`：都缺省按匿名放行，只带一个报 40101，会话不匹配报 40102。用户和会话都在内存，重启即清空。
- 拦截器注册在 `/**`，但 `/api/actuator/health` 实测不受身份约束。
- 包之间允许循环依赖，不加 ArchUnit（ADR 0003）；分层方向仍是 `controller → service → mapper`。
- 目前没有业务表，Flyway 只有 pgvector baseline；建业务表先走建模讨论再写 migration，禁止 `ddl-auto`。

## 前端

- 顶层路由只有 `/login`、`/`（首页单体）、未知路径 404；首页内按侧栏菜单切组件，URL 不变。
- `frontend/src/config/menu.ts` 是菜单唯一注册点；`HomePage` 按 Pinia `useNavStore().activeItem` 渲染组件。
- 新增面板 = 新建 `components/home/XxxPanel.vue` + `menu.ts` 注册 + `config/docs.ts` 补说明；`docs.spec.ts` 会断言每个菜单项都有文档。
- 身份存 localStorage（`harness-agent.*`），`lib/http.ts` 统一加两个头并在 40101/40102 时清身份回登录；组件内不要各自处理。
- 拖宽/收起逻辑在 `composables/useResizableWidth.ts`，侧栏与文档目录共用；宽度和收起状态各自存 localStorage。
- 单测跑在 node 环境（无 DOM），`lib/identity.ts` 会退化到内存；要测组件 DOM 交互需先引入 jsdom。
- 路由测试用 `createAppRouter(createMemoryHistory())`（`router/createAppRouter.ts`），不要直接 import `router/index.ts`——它会执行 `createWebHistory()`，node 下没有 window。
- `lib/sse.ts` 是骨架期的 `EventSource` 封装，带不了自定义头；接 SSE 前要改成 fetch 流式。
- axios `baseURL` 固定 `/api`，靠 Vite 代理；后端没有 CORS，跨源部署需要反代或补 CORS。

## 协作

- 提交信息用 `feat:` / `fix:` + 中文正文（见 `git log`），一次改动保持前后端与文档同步。
