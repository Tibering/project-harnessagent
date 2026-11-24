# 项目约定

## 回答页：本项目禁用 answer-me-with-html

本项目不调用 `answer-me-with-html` skill，回复只用文字。

- 全局 `AGENTS.md` 里的 `[answer-me-with-html always-on]` 规则在本项目不生效，以本文件为准。
- 不生成 HTML 页面，不调用 `am render`，不因"给出结论"而附带页面。
- 只有在用户当次明确要求出页面时才例外，此时写到 `docs/answers/`。
- `docs/answers/` 里已有的归档页面保留不动，不再新增。

## 后端

包结构见 `README.md` 与 `docs/adr/`。包之间允许循环依赖，不做自动检查（ADR 0003）。
