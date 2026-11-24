# ADR 0003 允许一级包之间循环依赖

- 状态：已接受
- 日期：2026-11-23
- 取代：ADR 0002 的决定 4

## 背景

ADR 0002 把包结构改回常规分层后，只保留一条 ArchUnit 规则：一级包不能有循环依赖。

落地时这条规则立刻拦住了一个真实场景：`common.ApiResponse` 需要 `exception.ErrorCode`，
`exception.GlobalExceptionHandler` 又需要 `common.ApiResponse`。为了过规则，只能把
`ApiResponse.fail` 改成收 `int code`，把类型信息丢掉。这类拆包在水平分层下会反复出现。

## 决定

1. 取消"一级包无环"检查，允许包之间循环依赖。
2. 删除 `ArchitectureTest` 和 `archunit-junit5` 依赖。
3. 分层方向（`controller` → `service` → `mapper`）仍是编码约定，由评审保证，不用测试强制。

## 后果

- 包间循环不再被自动拦截。出现环时只能靠代码评审和使用习惯发现。
- `ApiResponse.fail` 保持 `int code` 形式。规则取消后没有改回枚举，避免无意义改动。
- 后续若要加层依赖规则（比如 `controller` 不得直接调 `mapper`），需要重新引入 ArchUnit。
