# ADR 0004 体验期身份：无密码入场

- 状态：已接受
- 日期：2026-11-24

## 背景

骨架阶段没有 Security，也没有租户表，但前端需要一个"能进去用"的入口。希望在认证授权正式设计之前，
先把交互跑通：用户首屏输入用户名与昵称，之后所有请求都带着这个身份调后端。

关键约束：**这套体验期身份不能成为以后的返工来源**。真正的认证要能替换掉它，而不动业务代码、前端契约和接口形状。

## 决定

1. 入口是 `POST /api/experience/session`，只收 `username` 与 `nickname`，不收密码。
2. 返回 `{ userId, sessionId, user }`；前端存下来，之后每个请求带 `X-User-Id` 与 `X-Session-Id` 两个头。
3. 会话必须同时匹配 userId 与 sessionId，否则 `40102`；只带其中一个头 `40101`；都不带视为匿名。
4. 用户与会话都只存在进程内存（`ConcurrentHashMap`），重启清空，不落库、不写迁移。
5. `username` 是身份键：同名再次进入复用同一个用户、新开一个会话。等于"无密码认领"。
6. 用户 CRUD（`/api/users`）在体验期全开放，不校验身份；认证落地后统一收紧。
7. 用户模型带 `tenantId`（默认 `default`）与 `roles`（默认 `USER`），为后续租户与权限留位，但现在不校验、不隔离。
8. 业务代码只依赖 `CurrentUserHolder` 里的 `CurrentUser`，不关心身份从哪来。

## 后果

- **安全**：任何人知道用户名即可进入该身份；CRUD 无鉴权。因此本约定只允许用于本机与内网，
  **认证落地前不得公网部署**。
- **数据**：用户数据随进程消失，不能当真实账号使用；测试需自建数据，不能依赖预置账号。
- **替换成本**：接认证时只改 `CurrentUserInterceptor` 的解析逻辑与 session 的签发/校验，
  `CurrentUser`、`/api/users`、前端请求头结构都不变。若要换成 `Authorization: Bearer`，属于一次前端同步改动，
  并把两个头合并成一个。
- 未引入 Spring Security，也没有密码哈希；这些都是 auth 阶段的活。

## 相关

- 契约实现：`controller/auth/ExperienceSessionController`、`controller/user/UserController`
- 解析逻辑：`config/CurrentUserInterceptor`
- 存储：`service/user/InMemoryUserService`、`service/auth/ExperienceSessionService`
