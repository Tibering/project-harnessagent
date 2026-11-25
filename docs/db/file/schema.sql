-- 文件管理域 · 结构（DRAFT，待签字）
-- 来源：docs/db/file/spec.md（D-01 ~ D-13、R-001 ~ R-012）
-- 表：file / file_chunk / ingest_task（kb_file 等知识库原型确定后再建）
-- 注意：本文件不在 backend/src/main/resources/db/migration 下，未执行。
-- 定稿后按 Flyway 命名复制为 V<yyyymmddHHMM>__file_init.sql。

CREATE TABLE file (
    id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       varchar(32)  NOT NULL,
    name            varchar(255) NOT NULL,
    ext             varchar(16)  NOT NULL,
    mime            varchar(128) NOT NULL,
    size_bytes      bigint       NOT NULL CHECK (size_bytes > 0),
    content_hash    char(64)     NOT NULL,
    storage_key     text         NOT NULL,
    status          varchar(16)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'chunking', 'chunked', 'embedding', 'ready', 'failed')),
    uploader_id     uuid,
    uploader_name   varchar(64)  NOT NULL,
    last_operator_name varchar(64) NOT NULL,
    last_operated_at   timestamptz NOT NULL DEFAULT now(),
    chunk_spec_version varchar(32) NOT NULL,
    parser_version     varchar(32) NOT NULL,
    failure_reason  text,
    embedding_model varchar(64),
    embedding_dim   integer,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    deleted_at      timestamptz,
    CHECK (ext IN ('txt', 'md', 'pdf', 'docx')),
    CHECK (size_bytes <= 20 * 1024 * 1024)
);

-- R-002：同租户未删除文件按内容去重
CREATE UNIQUE INDEX uq_file_tenant_hash
    ON file (tenant_id, content_hash)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_file_tenant_status_created
    ON file (tenant_id, status, created_at DESC);

CREATE INDEX idx_file_uploader
    ON file (uploader_id);

-- R-014：清理满 30 天的软删文件
CREATE INDEX idx_file_purge
    ON file (deleted_at)
    WHERE deleted_at IS NOT NULL;

CREATE TABLE file_chunk (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id         uuid        NOT NULL REFERENCES file (id),
    tenant_id       varchar(32) NOT NULL,
    chunk_index     integer     NOT NULL CHECK (chunk_index >= 1),
    content         text        NOT NULL CHECK (length(content) > 0),
    char_count      integer     NOT NULL CHECK (char_count > 0),
    token_count     integer,
    embedding       vector(1024),
    embedding_model varchar(64),
    embedding_dim   integer,
    created_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);

-- R-006：同一文件的有效分片序号唯一
CREATE UNIQUE INDEX uq_chunk_file_index
    ON file_chunk (file_id, chunk_index)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_chunk_file
    ON file_chunk (file_id, chunk_index);

-- 检索路径：cosine top-k
CREATE INDEX idx_chunk_embedding
    ON file_chunk USING hnsw (embedding vector_cosine_ops)
    WHERE deleted_at IS NULL;

CREATE TABLE ingest_task (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id       uuid        NOT NULL REFERENCES file (id),
    tenant_id     varchar(32) NOT NULL,
    type          varchar(16) NOT NULL CHECK (type IN ('chunk', 'embed')),
    status        varchar(16) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
    attempt       integer     NOT NULL DEFAULT 0 CHECK (attempt >= 0),
    max_attempts  integer     NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
    error_message text,
    started_at    timestamptz,
    finished_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- R-007：同一文件同一类型只允许一个活动任务
CREATE UNIQUE INDEX uq_task_active
    ON ingest_task (file_id, type)
    WHERE status IN ('pending', 'running');

CREATE INDEX idx_task_poll
    ON ingest_task (status, created_at);

CREATE INDEX idx_task_file
    ON ingest_task (file_id, created_at DESC);
