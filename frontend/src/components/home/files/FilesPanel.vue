<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  ArrowLeft,
  CircleAlert,
  Layers,
  Link2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next'
import Badge from '@/components/ui/badge/Badge.vue'
import Button from '@/components/ui/button/Button.vue'
import ConfirmDialog from '@/components/ui/confirm/ConfirmDialog.vue'
import Pagination from '@/components/ui/pagination/Pagination.vue'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useFilesStore } from '@/stores/files'
import FileUploadDrawer from './FileUploadDrawer.vue'
import {
  formatSize,
  STATUS_META,
  type FileChunk,
  type FileItem,
  type FileStatus,
  type FileType,
} from '@/mocks/files'

type NoticeTone = 'info' | 'success' | 'error'
interface Notice {
  tone: NoticeTone
  text: string
}

const auth = useAuthStore()
const store = useFilesStore()

const keyword = ref('')
const statusFilter = ref<'all' | FileStatus>('all')
const selectedId = ref<string | null>(null)
const uploadOpen = ref(false)
const notice = ref<Notice | null>(null)
const viewMode = ref<'active' | 'trash'>('active')
const confirmTarget = ref<{ file: FileItem; action: 'remove' | 'purge' } | null>(null)
const RETENTION_DAYS = 30

const LIST_PAGE_SIZE = 5
const CHUNK_PAGE_SIZE = 5

const page = ref(1)
const chunkPage = ref(1)

let noticeTimer: ReturnType<typeof setTimeout> | undefined

const activeCount = computed(() => store.files.filter((file) => !file.deletedAt).length)
const trashedCount = computed(() => store.files.filter((file) => Boolean(file.deletedAt)).length)

const filtered = computed(() => {
  const keywordValue = keyword.value.trim().toLowerCase()
  const trash = viewMode.value === 'trash'
  return store.files
    .filter((file) => (trash ? Boolean(file.deletedAt) : !file.deletedAt))
    .filter((file) => {
      const matchesKeyword = keywordValue.length === 0
        || file.name.toLowerCase().includes(keywordValue)
        || file.uploader.toLowerCase().includes(keywordValue)
      const matchesStatus = trash || statusFilter.value === 'all' || file.status === statusFilter.value
      return matchesKeyword && matchesStatus
    })
    .sort((a, b) => {
      if (trash) {
        return (b.deletedAt ?? '').localeCompare(a.deletedAt ?? '')
      }
      return b.createdAt.localeCompare(a.createdAt)
    })
})

const pagedFiles = computed(() => {
  const start = (page.value - 1) * LIST_PAGE_SIZE
  return filtered.value.slice(start, start + LIST_PAGE_SIZE)
})

const selected = computed(() => store.files.find((file) => file.id === selectedId.value) ?? null)

const visibleChunks = computed<FileChunk[]>(() => {
  const chunks = selected.value?.chunks ?? []
  const start = (chunkPage.value - 1) * CHUNK_PAGE_SIZE
  return chunks.slice(start, start + CHUNK_PAGE_SIZE)
})

const confirmMessage = computed(() => {
  const target = confirmTarget.value
  if (!target) {
    return ''
  }
  if (target.action === 'purge') {
    return `确定彻底删除「${target.file.name}」吗？分片与向量会一并移除，无法恢复。`
  }
  return `确定删除「${target.file.name}」吗？删除后进入回收站，保留 ${RETENTION_DAYS} 天。`
})

const chunkEmptyHint = computed(() => {
  const status = selected.value?.status
  if (status === 'pending') {
    return '尚未分片，点击「分片」开始。'
  }
  if (status === 'failed') {
    return '分片失败，点击「重试」重试。'
  }
  if (status === 'chunking') {
    return '正在分片，完成后显示分片结果。'
  }
  if (status === 'embedding') {
    return '正在向量化，完成后显示向量状态。'
  }
  return '尚无分片。'
})

watch([keyword, statusFilter], () => {
  page.value = 1
})

watch(viewMode, () => {
  page.value = 1
  selectedId.value = null
})

watch(
  () => filtered.value.length,
  (total) => {
    const maxPage = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE))
    if (page.value > maxPage) {
      page.value = maxPage
    }
  },
)

const timeline = computed(() => {
  const file = selected.value
  if (!file) {
    return []
  }
  const steps = [
    { label: '上传完成', state: 'done' },
    { label: '分片', state: 'pending' },
    { label: 'RAG 向量化', state: 'pending' },
  ]
  if (file.status === 'chunked') {
    steps[1] = { label: '分片完成', state: 'done' }
  } else if (file.status === 'chunking') {
    steps[1] = { label: '分片中', state: 'active' }
  } else if (file.status === 'embedding') {
    steps[1] = { label: '分片完成', state: 'done' }
    steps[2] = { label: '向量化中', state: 'active' }
  } else if (file.status === 'ready') {
    steps[1] = { label: '分片完成', state: 'done' }
    steps[2] = { label: '向量化完成', state: 'done' }
  } else if (file.status === 'failed') {
    steps[1] = { label: '分片失败', state: 'failed' }
  }
  return steps
})

function setNotice(tone: NoticeTone, text: string): void {
  notice.value = { tone, text }
  if (noticeTimer) {
    clearTimeout(noticeTimer)
    noticeTimer = undefined
  }
  if (tone !== 'error') {
    noticeTimer = setTimeout(() => {
      if (notice.value?.text === text) {
        notice.value = null
      }
    }, 5_000)
  }
}

function openDetail(id: string): void {
  selectedId.value = id
  chunkPage.value = 1
}

function closeDetail(): void {
  selectedId.value = null
}

function askRemove(file: FileItem): void {
  if (store.isProcessing(file)) {
    setNotice('error', `「${file.name}」正在处理，暂时不能删除`)
    return
  }
  if (file.references > 0) {
    setNotice('error', `「${file.name}」被 ${file.references} 个知识库引用，无法删除`)
    return
  }
  confirmTarget.value = { file, action: 'remove' }
}

function askPurge(file: FileItem): void {
  confirmTarget.value = { file, action: 'purge' }
}

function confirmAction(): void {
  const target = confirmTarget.value
  confirmTarget.value = null
  if (!target) {
    return
  }
  const { file, action } = target

  if (action === 'purge') {
    store.purge(file)
    if (selectedId.value === file.id) {
      selectedId.value = null
    }
    setNotice('success', `已彻底删除「${file.name}」（原型：仅从本地列表移除）`)
    return
  }

  const result = store.remove(file, operatorName())
  if (result === 'processing') {
    setNotice('error', `「${file.name}」正在处理，暂时不能删除`)
    return
  }
  if (result === 'referenced') {
    setNotice('error', `「${file.name}」被 ${file.references} 个知识库引用，无法删除`)
    return
  }
  if (selectedId.value === file.id) {
    selectedId.value = null
  }
  setNotice('success', `已删除「${file.name}」，可在回收站恢复（保留 ${RETENTION_DAYS} 天）`)
}

function restoreFile(file: FileItem): void {
  const result = store.restore(file)
  if (result === 'conflict') {
    setNotice('error', `「${file.name}」无法恢复：同租户已有相同内容的文件`)
    return
  }
  setNotice('success', `已恢复「${file.name}」`)
}

function daysLeft(file: FileItem): number {
  if (!file.deletedAt) {
    return 0
  }
  const deleted = new Date(file.deletedAt.replace(' ', 'T')).getTime()
  const elapsed = Date.now() - deleted
  return Math.max(0, RETENTION_DAYS - Math.floor(elapsed / 86_400_000))
}

function handleOpen(file: FileItem): void {
  openDetail(file.id)
}

type NextAction = { key: 'chunk' | 'embed'; label: string }

function nextActionOf(file: FileItem): NextAction | null {
  if (file.status === 'pending') {
    return { key: 'chunk', label: '分片' }
  }
  if (file.status === 'failed') {
    return { key: 'chunk', label: '重试' }
  }
  if (file.status === 'chunked') {
    return { key: 'embed', label: 'RAG' }
  }
  return null
}

function runNext(file: FileItem): void {
  const action = nextActionOf(file)
  if (action?.key === 'chunk') {
    startChunking(file)
  } else if (action?.key === 'embed') {
    startEmbedding(file)
  }
}

function operatorName(): string {
  return auth.nickname || auth.username || '当前用户'
}

function startChunking(file: FileItem): void {
  const started = store.startChunking(file, operatorName(), (done) => {
    if (done.status === 'failed') {
      setNotice('error', `「${done.name}」${done.failureReason ?? '分片失败'}`)
      return
    }
    setNotice('success', `「${done.name}」分片完成，共 4 片；下一步执行 RAG`)
  })
  if (started) {
    setNotice('info', `正在分片：「${file.name}」${file.attempts && file.attempts > 1 ? `（第 ${file.attempts} 次）` : ''}`)
  }
}

function startEmbedding(file: FileItem): void {
  const started = store.startEmbedding(file, operatorName(), (done) => {
    setNotice('success', `「${done.name}」已就绪，可以查看分片了`)
  })
  if (started) {
    setNotice('info', `正在向量化：「${file.name}」`)
  }
}

function handleUpload(payload: { files: Array<{ name: string; size: number; type: FileType }>; rejected: string[] }): void {
  uploadOpen.value = false
  viewMode.value = 'active'
  const result = store.addFiles(payload.files, operatorName())

  const parts: string[] = []
  if (result.added.length > 0) {
    parts.push(`新增 ${result.added.length} 个（未处理）`)
  }
  if (result.reused.length > 0) {
    parts.push(`${result.reused.length} 个内容重复已复用`)
  }
  if (payload.rejected.length > 0) {
    parts.push(`${payload.rejected.length} 个被拒绝`)
  }

  const sameName = result.added.some((added) =>
    store.files.some((file) => file.id !== added.id && !file.deletedAt && file.name === added.name),
  )
  if (sameName) {
    parts.push('同名文件已存在，新内容作为新文件入库；替换请删除旧文件')
  }

  setNotice(payload.rejected.length > 0 ? 'error' : 'info', parts.join('；') || '没有可上传的文件')
}

function clearFilters(): void {
  keyword.value = ''
  statusFilter.value = 'all'
}

function dotClass(state: string): string {
  if (state === 'done') {
    return 'bg-emerald-700'
  }
  if (state === 'active') {
    return 'bg-blue-600'
  }
  if (state === 'failed') {
    return 'bg-red-600'
  }
  return 'bg-slate-300'
}

function lineClass(state: string): string {
  if (state === 'done') {
    return 'bg-emerald-200'
  }
  if (state === 'active') {
    return 'bg-blue-200'
  }
  if (state === 'failed') {
    return 'bg-red-200'
  }
  return 'bg-slate-200'
}

function labelClass(state: string): string {
  if (state === 'failed') {
    return 'text-red-700'
  }
  return state === 'pending' ? 'text-slate-500' : 'text-slate-700'
}

function noticeClass(tone: NoticeTone): string {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (tone === 'error') {
    return 'border-red-200 bg-red-50 text-red-700'
  }
  return 'border-blue-200 bg-blue-50 text-blue-700'
}

onBeforeUnmount(() => {
  if (noticeTimer) {
    clearTimeout(noticeTimer)
  }
})
</script>

<template>
  <section>
    <header class="mb-4">
      <h1 class="text-2xl font-semibold tracking-tight">
        文件
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        上传后为「未处理」，需要依次执行「分片」和「RAG」向量化，完成后才能查看。当前为静态原型，数据来自前端 mock。
      </p>
    </header>

    <div
      v-if="notice"
      class="mb-4 flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"
      :class="noticeClass(notice.tone)"
      role="status"
    >
      <span>{{ notice.text }}</span>
      <button
        type="button"
        class="-m-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-current opacity-70 transition-opacity duration-150 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        aria-label="关闭提示"
        @click="notice = null"
      >
        <X
          class="h-4 w-4"
          aria-hidden="true"
        />
      </button>
    </div>

    <template v-if="!selected">
      <div class="flex flex-wrap items-center gap-3">
        <div
          class="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
          role="tablist"
          aria-label="文件视图"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="viewMode === 'active'"
            :class="cn(
              'h-8 rounded-md px-3 text-sm transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              viewMode === 'active' ? 'bg-blue-50 font-medium text-blue-800' : 'text-slate-600 hover:bg-slate-100',
            )"
            @click="viewMode = 'active'"
          >
            文件（{{ activeCount }}）
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="viewMode === 'trash'"
            :class="cn(
              'h-8 rounded-md px-3 text-sm transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              viewMode === 'trash' ? 'bg-blue-50 font-medium text-blue-800' : 'text-slate-600 hover:bg-slate-100',
            )"
            @click="viewMode = 'trash'"
          >
            回收站（{{ trashedCount }}）
          </button>
        </div>

        <div class="relative">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索文件名或上传人"
            aria-label="搜索文件"
            class="h-9 w-64 rounded-lg border border-slate-500 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
        </div>

        <select
          v-if="viewMode === 'active'"
          v-model="statusFilter"
          aria-label="按状态筛选"
          class="h-9 rounded-lg border border-slate-500 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <option value="all">
            全部状态
          </option>
          <option value="pending">
            未处理
          </option>
          <option value="chunking">
            分片中
          </option>
          <option value="chunked">
            已分片
          </option>
          <option value="embedding">
            向量化中
          </option>
          <option value="ready">
            已就绪
          </option>
          <option value="failed">
            失败
          </option>
        </select>

        <div
          v-if="viewMode === 'active'"
          class="ml-auto"
        >
          <Button
            size="sm"
            @click="uploadOpen = true"
          >
            <Plus
              class="h-4 w-4"
              aria-hidden="true"
            />
            上传文件
          </Button>
        </div>
      </div>

      <div class="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs font-medium text-slate-600">
              <tr class="border-b border-slate-200 bg-slate-50">
                <th class="h-10 px-4 text-left">
                  名称
                </th>
                <th class="h-10 px-4 text-left">
                  类型
                </th>
                <th class="h-10 px-4 text-right">
                  大小
                </th>
                <th class="h-10 px-4 text-left">
                  上传人
                </th>
                <th class="h-10 px-4 text-left">
                  状态
                </th>
                <th class="h-10 px-4 text-right">
                  分片 / 引用*
                </th>
                <th class="h-10 px-4 text-left">
                  {{ viewMode === 'trash' ? '删除时间' : '上传时间' }}
                </th>
                <th class="h-10 px-4 text-left">
                  最后操作
                </th>
                <th class="h-10 px-4 text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="file in pagedFiles"
                :key="file.id"
                class="h-11 border-b border-slate-200 last:border-0 hover:bg-slate-50"
              >
                <td class="px-4">
                  <button
                    v-if="viewMode === 'active'"
                    type="button"
                    class="block max-w-[240px] truncate text-left font-medium text-slate-900 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    @click="handleOpen(file)"
                  >
                    {{ file.name }}
                  </button>
                  <span
                    v-else
                    class="block max-w-[240px] truncate font-medium text-slate-700"
                  >{{ file.name }}</span>
                </td>
                <td class="px-4 text-slate-600">
                  .{{ file.type }}
                </td>
                <td class="px-4 text-right tabular-nums text-slate-600">
                  {{ formatSize(file.sizeBytes) }}
                </td>
                <td class="px-4 text-slate-600">
                  {{ file.uploader }}
                </td>
                <td class="px-4">
                  <Badge :tone="STATUS_META[file.status].tone">
                    {{ STATUS_META[file.status].label }}
                  </Badge>
                </td>
                <td class="px-4 text-right tabular-nums text-slate-600">
                  {{ file.chunkCount }} / {{ file.references }}
                </td>
                <td class="px-4 tabular-nums text-slate-500">
                  {{ viewMode === 'trash' ? file.deletedAt : file.createdAt }}
                </td>
                <td class="px-4">
                  <div class="max-w-[110px] truncate text-slate-600">
                    {{ file.lastOperator }}
                  </div>
                  <div
                    class="text-xs tabular-nums"
                    :class="viewMode === 'trash' ? 'text-amber-700' : 'text-slate-500'"
                  >
                    {{ viewMode === 'trash' ? `剩余 ${daysLeft(file)} 天` : file.lastOperatedAt }}
                  </div>
                </td>
                <td class="px-4 text-right">
                  <div
                    v-if="viewMode === 'active'"
                    class="flex items-center justify-end gap-1"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="openDetail(file.id)"
                    >
                      查看
                    </Button>

                    <Button
                      v-if="nextActionOf(file)"
                      variant="secondary"
                      size="sm"
                      @click="runNext(file)"
                    >
                      {{ nextActionOf(file)?.label }}
                    </Button>
                    <span
                      v-else-if="store.isProcessing(file)"
                      class="px-2 text-xs text-slate-500"
                    >处理中…</span>

                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-red-700 hover:bg-red-50"
                      :disabled="store.isProcessing(file)"
                      :title="store.isProcessing(file) ? '处理中不可删除' : undefined"
                      @click="askRemove(file)"
                    >
                      删除
                    </Button>
                  </div>

                  <div
                    v-else
                    class="flex items-center justify-end gap-1"
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      @click="restoreFile(file)"
                    >
                      恢复
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-red-700 hover:bg-red-50"
                      @click="askPurge(file)"
                    >
                      彻底删除
                    </Button>
                  </div>
                </td>
              </tr>

              <tr v-if="filtered.length === 0">
                <td
                  colspan="9"
                  class="px-4 py-12 text-center"
                >
                  <Layers
                    class="mx-auto h-6 w-6 text-slate-400"
                    aria-hidden="true"
                  />
                  <p class="mt-3 text-base font-semibold text-slate-900">
                    {{ viewMode === 'trash' ? '回收站为空' : '没有匹配的文件' }}
                  </p>
                  <p class="mt-1 text-sm text-slate-500">
                    {{ viewMode === 'trash' ? '删除的文件会在这里保留 30 天。' : '换个关键词或状态试试。' }}
                  </p>
                  <div class="mt-4 flex justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      @click="clearFilters()"
                    >
                      清除筛选
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="flex items-center justify-between border-t border-slate-200 px-4 py-2">
          <span class="text-xs text-slate-500">共 {{ filtered.length }} 个文件，每页 {{ LIST_PAGE_SIZE }} 个</span>
          <Pagination
            v-model:page="page"
            :total="filtered.length"
            :page-size="LIST_PAGE_SIZE"
          />
        </footer>
      </div>

      <p class="mt-2 text-xs text-slate-500">
        * 引用数为知识库模块接入前的示例数据。
      </p>
    </template>

    <template v-else>
      <button
        type="button"
        class="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        @click="closeDetail()"
      >
        <ArrowLeft
          class="h-4 w-4"
          aria-hidden="true"
        />
        返回列表
      </button>

      <div class="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-2">
            <h2 class="truncate text-xl font-semibold">
              {{ selected.name }}
            </h2>
            <Badge :tone="STATUS_META[selected.status].tone">
              {{ STATUS_META[selected.status].label }}
            </Badge>
          </div>
          <p class="mt-1 text-sm text-slate-500">
            .{{ selected.type }} · {{ formatSize(selected.sizeBytes) }} · {{ selected.uploader }} · {{ selected.createdAt }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <template v-if="selected.status === 'pending'">
            <Button
              size="sm"
              @click="startChunking(selected)"
            >
              分片
            </Button>
          </template>
          <template v-else-if="selected.status === 'failed'">
            <Button
              size="sm"
              @click="startChunking(selected)"
            >
              重试
            </Button>
          </template>
          <template v-else-if="selected.status === 'chunked'">
            <Button
              variant="secondary"
              size="sm"
              @click="startChunking(selected)"
            >
              重新分片
            </Button>
            <Button
              size="sm"
              @click="startEmbedding(selected)"
            >
              执行 RAG
            </Button>
          </template>
          <template v-else-if="selected.status === 'ready'">
            <Button
              variant="secondary"
              size="sm"
              @click="startChunking(selected)"
            >
              重新分片
            </Button>
            <Button
              variant="secondary"
              size="sm"
              @click="startEmbedding(selected)"
            >
              重新 RAG
            </Button>
          </template>
          <span
            v-else
            class="text-xs text-slate-500"
          >处理中…</span>
          <Button
            variant="danger"
            size="sm"
            :disabled="store.isProcessing(selected)"
            :title="store.isProcessing(selected) ? '处理中不可删除' : undefined"
            @click="askRemove(selected)"
          >
            <Trash2
              class="h-4 w-4"
              aria-hidden="true"
            />
            删除
          </Button>
        </div>
      </div>

      <div
        v-if="selected.failureReason"
        class="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        role="alert"
      >
        <CircleAlert
          class="mt-0.5 h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <span>{{ selected.failureReason }}</span>
      </div>

      <section class="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-base font-semibold">
          知识库引用（示例）
        </h3>
        <div
          v-if="selected.referencedBy.length > 0"
          class="mt-3 flex flex-wrap gap-2"
        >
          <Badge
            v-for="kb in selected.referencedBy"
            :key="kb"
            tone="info"
          >
            {{ kb }}
          </Badge>
        </div>
        <p
          v-else
          class="mt-3 flex items-center gap-2 text-sm text-slate-500"
        >
          <Link2
            class="h-4 w-4"
            aria-hidden="true"
          />
          尚未被知识库引用。知识库模块接入后在这里展示引用方。
        </p>
      </section>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 class="text-base font-semibold">
            文件信息
          </h3>
          <dl class="mt-3 grid grid-cols-3 gap-x-4 gap-y-3 text-sm sm:grid-cols-5">
            <div>
              <dt class="text-xs text-slate-500">
                类型
              </dt>
              <dd class="mt-1 text-slate-700">
                .{{ selected.type }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">
                大小
              </dt>
              <dd class="mt-1 tabular-nums text-slate-700">
                {{ formatSize(selected.sizeBytes) }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">
                分片数
              </dt>
              <dd class="mt-1 tabular-nums text-slate-700">
                {{ selected.chunkCount }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">
                引用数
              </dt>
              <dd class="mt-1 tabular-nums text-slate-700">
                {{ selected.references }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">
                上传时间
              </dt>
              <dd class="mt-1 tabular-nums text-slate-700">
                {{ selected.createdAt }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">
                最后操作人
              </dt>
              <dd class="mt-1 text-slate-700">
                {{ selected.lastOperator }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">
                最后操作时间
              </dt>
              <dd class="mt-1 tabular-nums text-slate-700">
                {{ selected.lastOperatedAt }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 class="text-base font-semibold">
            摄取进度
          </h3>
          <ol class="mt-5 flex items-start">
            <li
              v-for="(step, index) in timeline"
              :key="step.label"
              class="relative flex flex-1 flex-col items-center"
              :aria-current="step.state === 'active' ? 'step' : undefined"
            >
              <span
                v-if="index < timeline.length - 1"
                class="absolute left-1/2 top-[5px] h-0.5 w-full"
                :class="lineClass(step.state)"
                aria-hidden="true"
              />
              <span
                class="relative z-10 h-3 w-3 shrink-0 rounded-full ring-4 ring-white"
                :class="dotClass(step.state)"
                aria-hidden="true"
              />
              <span
                class="mt-2 text-center text-xs"
                :class="labelClass(step.state)"
              >
                {{ step.label }}
              </span>
            </li>
          </ol>
        </section>
      </div>

      <section class="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold">
            分片预览
          </h3>
        </div>

        <div
          v-if="selected.chunks.length === 0"
          class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500"
        >
          {{ chunkEmptyHint }}
        </div>

        <div
          v-else
          class="mt-4 h-[280px] space-y-2 overflow-y-auto pr-1 sm:h-[360px] lg:h-[420px]"
        >
          <article
            v-for="chunk in visibleChunks"
            :key="chunk.id"
            class="rounded-lg border border-slate-200 p-3"
          >
            <div class="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span class="tabular-nums">#{{ chunk.index }} · {{ chunk.tokens }} tokens</span>
              <Badge :tone="chunk.vectorized ? 'neutral' : 'warning'">
                {{ chunk.vectorized ? '已向量化' : '未向量化' }}
              </Badge>
            </div>
            <p class="mt-2 text-sm leading-6 text-slate-700">
              {{ chunk.text }}
            </p>
          </article>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <span class="text-xs text-slate-500">
            共 {{ selected.chunks.length }} 片，每页 {{ CHUNK_PAGE_SIZE }} 片
          </span>
          <Pagination
            v-if="selected.chunks.length > CHUNK_PAGE_SIZE"
            v-model:page="chunkPage"
            :total="selected.chunks.length"
            :page-size="CHUNK_PAGE_SIZE"
          />
        </div>
      </section>
    </template>

    <FileUploadDrawer
      :open="uploadOpen"
      @close="uploadOpen = false"
      @submit="handleUpload"
    />

    <ConfirmDialog
      :open="confirmTarget !== null"
      :title="confirmTarget?.action === 'purge' ? '彻底删除文件' : '删除文件'"
      :message="confirmMessage"
      :confirm-text="confirmTarget?.action === 'purge' ? '彻底删除' : '删除'"
      @confirm="confirmAction()"
      @cancel="confirmTarget = null"
    />
  </section>
</template>
