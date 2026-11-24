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

打开 <http://localhost:5173>，首次进入会用体验期身份（用户名 + 昵称）登录（Vite 已把 `/api` 代理到 8090）。

前端三个顶层页面：

| 路由 | 说明 |
|---|---|
| `/login` | 体验期身份入场，无侧栏 |
| `/` | 首页单体：侧栏菜单在内部切换组件，URL 不变；顶部是面包栏 |
| 其他路径 | 直接渲染 404，保留原始地址 |

- 菜单与组件注册：`frontend/src/config/menu.ts`
- 组件说明页（侧栏「文档」）：`frontend/src/config/docs.ts`
- 身份与请求头：`frontend/src/stores/auth.ts`、`frontend/src/lib/http.ts`
- 会话失效（`40101`/`40102`）会清空本地身份并跳回登录页

## 体验期身份（无登录）

骨架阶段还没有认证。首屏输入用户名与昵称即可进入，之后每个请求带上服务端返回的两个头：

| 头 | 值 |
|---|---|
| `X-User-Id` | 入场接口返回的 `userId` |
| `X-Session-Id` | 入场接口返回的 `sessionId` |

```bash
# 进入（同名再次进入复用同一用户，会话是新的）
curl -s -X POST http://localhost:8090/api/experience/session \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","nickname":"爱丽丝"}'

# 之后带着两个头
curl -s http://localhost:8090/api/experience/session \
  -H 'X-User-Id: <userId>' -H 'X-Session-Id: <sessionId>'
```

接口一览：

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/experience/session` | 进入系统，拿 `userId` + `sessionId` |
| GET | `/api/experience/session` | 查看当前身份（需两个头） |
| DELETE | `/api/experience/session` | 退出，只作废当前会话 |
| GET | `/api/users?q=` | 用户列表，可按用户名/昵称/租户过滤 |
| GET | `/api/users/{id}` | 用户详情 |
| POST | `/api/users` | 新建用户 |
| PUT | `/api/users/{id}` | 修改昵称、租户、角色 |
| DELETE | `/api/users/{id}` | 删除用户 |

约束：

- 用户与会话都只在内存，**重启即清空**，不要当真实账号用。
- 体验期没有任何鉴权，`/api/users` 全开放；约定见 [ADR 0004](docs/adr/0004-experience-identity.md)。
- **认证落地前不得公网部署**，只在本机或内网使用。

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


