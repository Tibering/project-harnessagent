-- 骨架基线：只启用 pgvector 扩展，不建任何业务表。
-- 业务表由各模块的建模讨论定稿后，按 V<yyyyMMddHHmmss>__<domain>_<action>.sql 追加。
CREATE EXTENSION IF NOT EXISTS vector;
