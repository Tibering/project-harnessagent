# ADR 0001 项目骨架

- 状态：已接受（决定 2 被 ADR 0002 取代）
- 日期：2026-11-23

## 背景

新建一个多租户 RAG Agent 平台，前后端分离，长期维护。需要先定骨架，再按模块推进。

## 决定

1. 单仓库 monorepo：`frontend/`、`backend/`、`deploy/`、`docs/`。
2. ~~后端单 Spring Boot 模块，包根 `com.project.harnessagent`，按垂直切片分模块，模块内 `api` / `internal` 双层。~~（已由 ADR 0002 改为常规分层）
3. PostgreSQL 17 + pgvector，Flyway 管 `public` schema 的业务表。
4. Spring MVC + `SseEmitter`，不用 WebFlux。
5. 前端 Vue 3 + Vite + TypeScript + Tailwind 4，组件按 shadcn-vue 方式内置。
6. 骨架不包含：业务表、业务接口、业务模块目录、Security、AgentScope。

## 后果

- 包结构守卫见 ADR 0002：只拦一级包循环依赖。
- 引入 AgentScope 时会带来第二套表结构（`agentscope` schema），由框架自建，Flyway 不接管。
- 前端组件需自己维护，升级不受第三方组件库节奏约束。
