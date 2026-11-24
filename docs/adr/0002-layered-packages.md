# ADR 0002 后端包结构改回常规分层

- 状态：已接受（决定 4 被 ADR 0003 取代）
- 日期：2026-11-23
- 取代：ADR 0001 的决定 2

## 背景

ADR 0001 定的是垂直切片：`<module>/api` 对外、`<module>/internal` 私有，靠 ArchUnit 拦跨模块访问。
骨架落地后确认，后端要按常规 Spring Boot 的目录习惯组织。

## 决定

1. 一级包用常见叫法：`controller`、`service`、`mapper`、`entity`、`dto`、`config`、`common`、`exception`。
2. 业务名做二级包，例如 `controller/auth`、`service/auth`、`mapper/auth`、`entity/auth`。
3. 依赖方向单向往下：`controller` → `service` → `mapper`，通用件只被上层依赖。
4. ~~ArchUnit 只保留"一级包无环"。`internal` 访问规则删除。~~（已由 ADR 0003 取消）

## 后果

- 模块边界不再由编译期规则拦截，只靠包名约定和依赖方向。水平分层下跨模块调用无法自动阻止。
- `common` 与 `exception` 天然容易成环：`ApiResponse` 需要 `ErrorCode`，处理器又需要 `ApiResponse`。
  因此 `ApiResponse.fail` 只收 `int code`，依赖方向固定为 `exception` → `common`。
- 新增业务模块时要同时动四个层包，一个模块的代码分散在四处。
