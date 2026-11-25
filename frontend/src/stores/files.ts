import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  MOCK_FILES,
  nowText,
  type FileChunk,
  type FileItem,
  type FileType,
} from '@/mocks/files'

export interface UploadPayload {
  name: string
  size: number
  type: FileType
}

export type RemoveResult = 'deleted' | 'processing' | 'referenced'
export type RestoreResult = 'restored' | 'conflict'

/** 原型阶段用「文件名 + 大小」模拟内容 hash，真实实现走 sha256。 */
function contentKey(name: string, size: number): string {
  return `${name.toLowerCase()}::${size}`
}

function seed(): FileItem[] {
  return MOCK_FILES.map((file) => ({
    ...file,
    chunks: file.chunks.map((chunk) => ({ ...chunk })),
  }))
}

function buildChunks(fileId: string, vectorized: boolean): FileChunk[] {
  return Array.from({ length: 4 }, (_, i) => ({
    id: `${fileId}-c${i + 1}`,
    index: i + 1,
    tokens: 120 + i * 24,
    text: '（原型）分片内容将在这里展示，正式解析后替换为真实文本。',
    vectorized,
  }))
}

function touch(file: FileItem, operator?: string): void {
  file.lastOperator = operator || file.uploader
  file.lastOperatedAt = nowText()
}

let uploadSeq = 0

export const useFilesStore = defineStore('files', () => {
  const files = ref<FileItem[]>(seed())
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  function isProcessing(file: FileItem): boolean {
    return file.status === 'chunking' || file.status === 'embedding'
  }

  function addFiles(payloads: UploadPayload[], uploader: string): { added: FileItem[]; reused: FileItem[] } {
    const added: FileItem[] = []
    const reused: FileItem[] = []
    const createdAt = nowText()
    const stamp = Date.now()

    payloads.forEach((payload) => {
      const key = contentKey(payload.name, payload.size)
      const existing = files.value.find(
        (file) => !file.deletedAt && contentKey(file.name, file.sizeBytes) === key,
      )
      if (existing) {
        reused.push(existing)
        return
      }
      const item: FileItem = {
        id: `f-${stamp}-${uploadSeq++}`,
        name: payload.name,
        type: payload.type,
        sizeBytes: payload.size,
        uploader,
        status: 'pending',
        references: 0,
        referencedBy: [],
        chunkCount: 0,
        createdAt,
        lastOperator: uploader,
        lastOperatedAt: createdAt,
        chunks: [],
      }
      files.value.unshift(item)
      added.push(item)
    })

    return { added, reused }
  }

  function remove(file: FileItem, operator?: string): RemoveResult {
    if (isProcessing(file)) {
      return 'processing'
    }
    if (file.references > 0) {
      return 'referenced'
    }
    file.deletedAt = nowText()
    touch(file, operator)
    return 'deleted'
  }

  function restore(file: FileItem): RestoreResult {
    const key = contentKey(file.name, file.sizeBytes)
    const conflict = files.value.some(
      (item) => item.id !== file.id && !item.deletedAt && contentKey(item.name, item.sizeBytes) === key,
    )
    if (conflict) {
      return 'conflict'
    }
    file.deletedAt = undefined
    return 'restored'
  }

  function purge(file: FileItem): void {
    files.value = files.value.filter((item) => item.id !== file.id)
  }

  function schedule(fileId: string, key: string, action: () => void, delay = 1_200): void {
    const timerKey = `${fileId}:${key}`
    const existing = timers.get(timerKey)
    if (existing) {
      clearTimeout(existing)
    }
    timers.set(timerKey, setTimeout(() => {
      timers.delete(timerKey)
      action()
    }, delay))
  }

  function startChunking(file: FileItem, operator?: string, onDone?: (file: FileItem) => void): boolean {
    if (isProcessing(file)) {
      return false
    }
    const attempt = (file.attempts ?? 0) + 1
    file.attempts = attempt
    file.status = 'chunking'
    file.failureReason = undefined
    file.chunks = []
    file.chunkCount = 0
    touch(file, operator)

    schedule(file.id, 'chunk', () => {
      const target = files.value.find((item) => item.id === file.id)
      if (!target || target.status !== 'chunking') {
        return
      }
      if (target.failUntilAttempt !== undefined && attempt <= target.failUntilAttempt) {
        target.status = 'failed'
        target.failureReason = `第 ${attempt} 次尝试失败：模拟解析错误`
        onDone?.(target)
        return
      }
      target.status = 'chunked'
      target.chunkCount = 4
      target.chunks = buildChunks(target.id, false)
      onDone?.(target)
    })
    return true
  }

  function startEmbedding(file: FileItem, operator?: string, onDone?: (file: FileItem) => void): boolean {
    if (file.status !== 'chunked' && file.status !== 'ready') {
      return false
    }
    file.status = 'embedding'
    touch(file, operator)

    schedule(file.id, 'embed', () => {
      const target = files.value.find((item) => item.id === file.id)
      if (!target || target.status !== 'embedding') {
        return
      }
      target.status = 'ready'
      target.chunks = target.chunks.map((chunk) => ({ ...chunk, vectorized: true }))
      onDone?.(target)
    })
    return true
  }

  function reset(): void {
    timers.forEach((timer) => clearTimeout(timer))
    timers.clear()
    files.value = seed()
  }

  return { files, isProcessing, addFiles, remove, restore, purge, startChunking, startEmbedding, reset }
})
