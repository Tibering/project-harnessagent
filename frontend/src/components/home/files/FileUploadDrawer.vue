<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Upload, X } from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'
import { ACCEPTED_TYPES, MAX_FILE_BYTES, extensionOf, formatSize, type FileType } from '@/mocks/files'

interface PickedFile {
  name: string
  size: number
  type: FileType
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  submit: [payload: { files: PickedFile[]; rejected: string[] }]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const folderInputRef = ref<HTMLInputElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const picked = ref<PickedFile[]>([])
const errors = ref<string[]>([])
const uploading = ref(false)
const progress = ref(0)

let progressTimer: ReturnType<typeof setInterval> | undefined
let lastFocused: HTMLElement | null = null

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const accept = computed(() => ACCEPTED_TYPES.map((ext) => `.${ext}`).join(','))
const visible = computed(() => picked.value.slice(0, 5))

function reset(): void {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = undefined
  }
  uploading.value = false
  progress.value = 0
  picked.value = []
  errors.value = []
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  if (folderInputRef.value) {
    folderInputRef.value.value = ''
  }
}

function addFiles(files: File[]): void {
  const nextErrors: string[] = []
  const accepted: PickedFile[] = []

  for (const file of files) {
    const ext = extensionOf(file.name) as FileType
    if (!ACCEPTED_TYPES.includes(ext)) {
      nextErrors.push(`${file.name}：不支持的类型`)
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      nextErrors.push(`${file.name}：超过 ${formatSize(MAX_FILE_BYTES)}`)
      continue
    }
    accepted.push({ name: file.name, size: file.size, type: ext })
  }

  picked.value = [...picked.value, ...accepted]
  errors.value = nextErrors
}

function onPick(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (files.length > 0) {
    addFiles(files)
  }
}

async function collectEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject)
    })
    out.push(file)
    return
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })
    for (const child of entries) {
      await collectEntry(child, out)
    }
  }
}

async function onDrop(event: DragEvent): Promise<void> {
  const items = Array.from(event.dataTransfer?.items ?? [])
  const entries = items
    .map((item) => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => entry !== null)

  if (entries.length > 0) {
    const collected: File[] = []
    for (const entry of entries) {
      await collectEntry(entry, collected)
    }
    if (collected.length > 0) {
      addFiles(collected)
      return
    }
  }

  const files = Array.from(event.dataTransfer?.files ?? [])
  if (files.length > 0) {
    addFiles(files)
  }
}

function removePicked(index: number): void {
  picked.value = picked.value.filter((_, i) => i !== index)
}

function submit(): void {
  if (picked.value.length === 0) {
    errors.value = ['请先选择文件或文件夹']
    return
  }
  if (uploading.value) {
    return
  }

  uploading.value = true
  progress.value = 0
  progressTimer = setInterval(() => {
    progress.value = Math.min(100, progress.value + 10)
    if (progress.value >= 100) {
      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = undefined
      }
      const payload = { files: picked.value, rejected: [...errors.value] }
      uploading.value = false
      emit('submit', payload)
    }
  }, 60)
}

function focusableItems(): HTMLElement[] {
  if (!panelRef.value) {
    return []
  }
  return Array.from(panelRef.value.querySelectorAll<HTMLElement>(FOCUSABLE))
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (!uploading.value) {
      emit('close')
    }
    return
  }
  if (event.key !== 'Tab') {
    return
  }
  const items = focusableItems()
  if (items.length === 0) {
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement as HTMLElement | null
  const inside = active !== null && panelRef.value?.contains(active)

  if (event.shiftKey && (!inside || active === first)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (!inside || active === last)) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (open) => {
    reset()
    if (open) {
      lastFocused = document.activeElement as HTMLElement | null
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      panelRef.value?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    } else {
      window.removeEventListener('keydown', onKeydown)
      lastFocused?.focus()
      lastFocused = null
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-30 bg-slate-950/40"
    @click="emit('close')"
  >
    <aside
      ref="panelRef"
      tabindex="-1"
      class="absolute right-0 top-0 z-40 flex h-full w-full max-w-[480px] flex-col bg-white shadow-md focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-title"
      @click.stop
    >
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-6">
        <h2
          id="upload-title"
          class="text-xl font-semibold"
        >
          上传文件
        </h2>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="关闭上传面板"
          @click="emit('close')"
        >
          <X
            class="h-5 w-5"
            aria-hidden="true"
          />
        </button>
      </header>

      <div class="flex-1 space-y-4 overflow-y-auto p-6">
        <div
          class="flex flex-col items-center justify-center rounded-xl border border-slate-500 bg-slate-50 px-6 py-8 text-center"
          @dragover.prevent
          @drop.prevent="onDrop"
        >
          <Upload
            class="h-6 w-6 text-slate-400"
            aria-hidden="true"
          />
          <span class="mt-3 text-sm font-medium text-slate-700">
            把文件或文件夹拖到这里
          </span>
          <span class="mt-1 text-xs text-slate-500">
            支持 txt / md / pdf / docx，单文件不超过 {{ formatSize(MAX_FILE_BYTES) }}
          </span>
          <div class="mt-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              @click="fileInputRef?.click()"
            >
              选择文件
            </Button>
            <Button
              variant="secondary"
              size="sm"
              @click="folderInputRef?.click()"
            >
              选择文件夹
            </Button>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            class="sr-only"
            aria-label="选择要上传的文件"
            :accept="accept"
            @change="onPick"
          >
          <input
            ref="folderInputRef"
            type="file"
            class="sr-only"
            aria-label="选择要上传的文件夹"
            webkitdirectory
            multiple
            @change="onPick"
          >
        </div>

        <div
          v-if="picked.length > 0"
          class="rounded-lg border border-slate-200 bg-white p-3"
        >
          <div class="flex items-center justify-between text-sm text-slate-700">
            <span>已选择 {{ picked.length }} 个文件</span>
            <button
              type="button"
              class="text-xs text-slate-500 hover:text-slate-700"
              @click="reset()"
            >
              清空
            </button>
          </div>
          <ul class="mt-2 space-y-1">
            <li
              v-for="(file, index) in visible"
              :key="`${file.name}-${index}`"
              class="flex items-center justify-between gap-2 text-xs text-slate-600"
            >
              <span class="min-w-0 truncate">{{ file.name }}</span>
              <span class="flex shrink-0 items-center gap-2">
                <span class="tabular-nums text-slate-500">{{ formatSize(file.size) }}</span>
                <button
                  type="button"
                  class="text-slate-400 hover:text-red-700"
                  :aria-label="`移除 ${file.name}`"
                  @click="removePicked(index)"
                >
                  <X
                    class="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                </button>
              </span>
            </li>
          </ul>
          <p
            v-if="picked.length > 5"
            class="mt-1 text-xs text-slate-500"
          >
            另有 {{ picked.length - 5 }} 个文件
          </p>
        </div>

        <ul
          v-if="errors.length > 0"
          class="space-y-1 text-sm text-red-700"
          role="alert"
        >
          <li
            v-for="error in errors"
            :key="error"
          >
            {{ error }}
          </li>
        </ul>

        <div
          v-if="uploading"
          class="space-y-2"
        >
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full rounded-full bg-blue-600 transition-all duration-100"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <p class="text-xs text-slate-500">
            正在上传… {{ progress }}%
          </p>
        </div>

        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
          原型说明：本页数据来自前端 mock，不会真正上传文件；上传后统一为「未处理」，需要在列表里逐个执行分片与 RAG。
          同名文件不会覆盖：内容不同会作为新文件入库，替换请删除旧文件后重新上传。
        </div>
      </div>

      <footer class="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
        <Button
          variant="secondary"
          size="sm"
          :disabled="uploading"
          @click="emit('close')"
        >
          取消
        </Button>
        <Button
          size="sm"
          :disabled="picked.length === 0 || uploading"
          @click="submit()"
        >
          {{ uploading ? '上传中…' : `开始上传${picked.length > 0 ? `（${picked.length}）` : ''}` }}
        </Button>
      </footer>
    </aside>
  </div>
</template>
