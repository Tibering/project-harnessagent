<script setup lang="ts">
import { ref } from 'vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { cn } from '@/lib/utils'

defineProps<{ sql: string }>()

type ViewMode = 'diagram' | 'sql'

const view = ref<ViewMode>('diagram')

const modes: Array<{ key: ViewMode; label: string }> = [
  { key: 'diagram', label: '图形' },
  { key: 'sql', label: '文字' },
]
</script>

<template>
  <!-- eslint-disable vue/max-attributes-per-line -- SVG 节点用单行属性便于对照坐标 -->
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-xl font-semibold">
          文件 DDL（草案）
        </h2>
        <p class="mt-1 text-xs text-slate-500">
          来源：docs/db/file/schema.sql · 未执行、待签字
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <Badge tone="warning">
          DRAFT
        </Badge>
        <div
          class="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
          role="tablist"
          aria-label="DDL 展示方式"
        >
          <button
            v-for="mode in modes"
            :key="mode.key"
            type="button"
            role="tab"
            :aria-selected="view === mode.key"
            :class="cn(
              'h-7 rounded-md px-3 text-xs transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              view === mode.key
                ? 'bg-blue-50 font-medium text-blue-800'
                : 'text-slate-600 hover:bg-slate-100',
            )"
            @click="view = mode.key"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>
    </div>

    <p class="mt-3 text-sm leading-6 text-slate-700">
      三张表：<code class="rounded bg-slate-100 px-1 font-mono text-xs">file</code>、
      <code class="rounded bg-slate-100 px-1 font-mono text-xs">file_chunk</code>、
      <code class="rounded bg-slate-100 px-1 font-mono text-xs">ingest_task</code>。
      <code class="rounded bg-slate-100 px-1 font-mono text-xs">kb_file</code> 等知识库原型确定后再建；
      向量列固定 <code class="rounded bg-slate-100 px-1 font-mono text-xs">vector(1024)</code>。
    </p>

    <div
      v-if="view === 'diagram'"
      class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      <svg
        viewBox="0 0 760 320"
        class="h-auto w-full"
        role="img"
        aria-label="file 一对多关联 file_chunk 与 ingest_task 的关系图"
      >
        <path
          d="M250 150 C 330 150, 330 80, 430 80"
          fill="none"
          stroke="#cbd5e1"
          stroke-width="1.5"
        />
        <path
          d="M250 200 C 330 200, 330 250, 430 250"
          fill="none"
          stroke="#cbd5e1"
          stroke-width="1.5"
        />
        <text x="266" y="132" fill="#64748b" font-size="11">1</text>
        <text x="410" y="74" fill="#64748b" font-size="11">N</text>
        <text x="266" y="226" fill="#64748b" font-size="11">1</text>
        <text x="410" y="244" fill="#64748b" font-size="11">N</text>

        <g>
          <rect
            x="10"
            y="110"
            width="240"
            height="166"
            rx="8"
            fill="#ffffff"
            stroke="#e2e8f0"
          />
          <text
            x="24"
            y="136"
            fill="#334155"
            font-size="13"
            font-weight="600"
          >file</text>
          <text x="24" y="160" fill="#64748b" font-size="11">id · PK</text>
          <text x="24" y="178" fill="#64748b" font-size="11">tenant_id</text>
          <text x="24" y="196" fill="#64748b" font-size="11">name / ext / status</text>
          <text x="24" y="214" fill="#64748b" font-size="11">content_hash</text>
          <text x="24" y="232" fill="#64748b" font-size="11">last_operator_name</text>
          <text x="24" y="250" fill="#64748b" font-size="11">chunk_spec_version</text>
          <text x="24" y="268" fill="#64748b" font-size="11">parser_version</text>
        </g>

        <g>
          <rect
            x="430"
            y="20"
            width="320"
            height="120"
            rx="8"
            fill="#ffffff"
            stroke="#e2e8f0"
          />
          <text
            x="444"
            y="46"
            fill="#334155"
            font-size="13"
            font-weight="600"
          >file_chunk</text>
          <text x="444" y="70" fill="#64748b" font-size="11">id · PK</text>
          <text x="444" y="88" fill="#64748b" font-size="11">file_id · FK → file.id</text>
          <text x="444" y="106" fill="#64748b" font-size="11">chunk_index · content</text>
          <text x="444" y="124" fill="#64748b" font-size="11">embedding vector(1024)</text>
        </g>

        <g>
          <rect
            x="430"
            y="190"
            width="320"
            height="120"
            rx="8"
            fill="#ffffff"
            stroke="#e2e8f0"
          />
          <text
            x="444"
            y="216"
            fill="#334155"
            font-size="13"
            font-weight="600"
          >ingest_task</text>
          <text x="444" y="240" fill="#64748b" font-size="11">id · PK</text>
          <text x="444" y="258" fill="#64748b" font-size="11">file_id · FK → file.id</text>
          <text x="444" y="276" fill="#64748b" font-size="11">type · status</text>
          <text x="444" y="294" fill="#64748b" font-size="11">attempt / max_attempts</text>
        </g>
      </svg>

      <p class="mt-2 text-xs text-slate-500">
        实线为物理外键；kb_file 等知识库原型确定后再建，本轮未画。
      </p>
    </div>

    <pre
      v-else
      class="mt-4 max-h-[560px] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-700"
    ><code>{{ sql }}</code></pre>
  </div>
</template>
