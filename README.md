# project-harnessagent

多租户 RAG Agent 平台。前后端分离，单仓库。

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vue 3 + Vite + TypeScript + Tailwind CSS 4 + shadcn-vue 风格组件 |
| 后端 | Spring Boot 3.5 + Java 21 + Maven，单模块 |
| 数据访问 | MyBatis-Plus + Flyway |
| 数据库 | PostgreSQL 17 + pgvector |
| Web 层 | Spring MVC + SseEmitter |
| Agent 运行时 | AgentScope Java 2.0（随 chat 模块引入） |

## 目录

```
frontend/   Vue 应用
backend/    Spring Boot 应用
deploy/     docker compose 与环境变量示例
docs/       设计文档与 ADR
```

## 本地启动

1. 起数据库

```bash
cd deploy
cp .env.example .env
docker compose up -d
```

2. 起后端（默认 8090，8080 常被别的服务占用）

```bash
cd backend
mvn spring-boot:run            # 或 SERVER_PORT=xxxx mvn spring-boot:run
```

健康检查：<http://localhost:8090/api/actuator/health>
接口文档：<http://localhost:8090/api/swagger-ui/index.html>

3. 起前端

```bash
cd frontend
pnpm install
pnpm dev
```

打开 <http://localhost:5173>，页面会显示后端健康状态（Vite 已把 `/api` 代理到 8090）。

## 验证

```bash
cd backend && mvn -B verify     # 单元测试 + Testcontainers 集成测试
cd frontend && pnpm lint && pnpm test && pnpm build
```

`mvn verify` 需要本机 Docker 在运行（Testcontainers 会拉起 `pgvector/pgvector:pg17`）。
没有 Docker 时集成测试自动跳过（`disabledWithoutDocker = true`）。

### Docker 29 注意事项

Docker Engine 29 只接受 API 版本 >= 1.44，而 docker-java 默认协商的版本更低，会拿到
`Status 400`。`pom.xml` 的 surefire 配置里已通过 `api.version=1.44` 传给测试 JVM，
不需要额外设置环境变量。

## 包结构约定

包之间**允许**循环依赖，不做自动检查。原因和取舍见 [ADR 0003](docs/adr/0003-allow-package-cycles.md)。

- 分层方向和业务子包是编码约定，靠评审保证：`controller/auth` → `service/auth` → `mapper/auth`
- 基础件：`common`（响应体、工具）、`config`（配置类）、`exception`（错误码、异常、全局处理）、`dto`
- 层方向不反向：`mapper` 不依赖 `service`，`service` 不依赖 `controller`
- ArchUnit 已移除。要加层依赖规则时重新引入，先补一条 ADR

骨架落地的参考：[ADR 0001](docs/adr/0001-skeleton.md)（骨架）、[ADR 0002](docs/adr/0002-layered-packages.md)（改回分层）。

## 其他约定

- 业务表由模块建模讨论定稿后追加 Flyway 迁移，骨架里不建业务表
- 统一响应体 `ApiResponse`，错误码见 `ErrorCode`
- 每个请求带 `X-Trace-Id`，日志 pattern 已接入 MDC


