import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFilesStore } from './files'
import type { FileType } from '@/mocks/files'

function upload(name: string, size: number, type: FileType = 'md') {
  return { name, size, type }
}

describe('files store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('按名称和大小去重，忽略大小写', () => {
    const store = useFilesStore()

    const first = store.addFiles([upload('A.md', 10)], 'alice')
    const second = store.addFiles([upload('a.md', 10)], 'alice')

    expect(first.added).toHaveLength(1)
    expect(second.added).toHaveLength(0)
    expect(second.reused).toHaveLength(1)
    expect(second.reused[0].id).toBe(first.added[0].id)
  })

  it('处理中或已被引用的文件不能删除', () => {
    const store = useFilesStore()
    const file = store.addFiles([upload('b.md', 20)], 'alice').added[0]

    file.status = 'chunking'
    expect(store.remove(file)).toBe('processing')

    file.status = 'pending'
    file.references = 1
    expect(store.remove(file)).toBe('referenced')

    file.references = 0
    expect(store.remove(file)).toBe('deleted')
    expect(file.deletedAt).toBeTruthy()
    expect(store.files.some((item) => item.id === file.id)).toBe(true)
  })

  it('恢复软删文件，同内容已被新文件占用时冲突', () => {
    const store = useFilesStore()
    const first = store.addFiles([upload('r.md', 60)], 'alice').added[0]

    expect(store.remove(first)).toBe('deleted')
    const second = store.addFiles([upload('r.md', 60)], 'alice').added[0]
    expect(second.id).not.toBe(first.id)

    expect(store.restore(first)).toBe('conflict')

    store.purge(second)
    expect(store.restore(first)).toBe('restored')
    expect(first.deletedAt).toBeUndefined()
  })

  it('分片完成后再向量化，分片状态与向量标记正确', () => {
    const store = useFilesStore()
    const file = store.addFiles([upload('c.md', 30)], 'alice').added[0]

    store.startChunking(file)
    expect(file.status).toBe('chunking')
    vi.advanceTimersByTime(1_200)

    expect(file.status).toBe('chunked')
    expect(file.chunks).toHaveLength(4)
    expect(file.chunks.every((chunk) => !chunk.vectorized)).toBe(true)

    store.startEmbedding(file)
    expect(file.status).toBe('embedding')
    vi.advanceTimersByTime(1_200)

    expect(file.status).toBe('ready')
    expect(file.chunks.every((chunk) => chunk.vectorized)).toBe(true)
  })

  it('前 N 次分片失败，重试后成功', () => {
    const store = useFilesStore()
    const file = store.addFiles([upload('d.md', 40)], 'alice').added[0]
    file.failUntilAttempt = 1

    store.startChunking(file)
    vi.advanceTimersByTime(1_200)
    expect(file.status).toBe('failed')
    expect(file.failureReason).toContain('第 1 次')

    store.startChunking(file)
    vi.advanceTimersByTime(1_200)
    expect(file.status).toBe('chunked')
    expect(file.chunks).toHaveLength(4)
  })

  it('reset 恢复种子数据', () => {
    const store = useFilesStore()
    const before = store.files.length
    store.addFiles([upload('e.md', 50)], 'alice')
    expect(store.files.length).toBe(before + 1)

    store.reset()
    expect(store.files.length).toBe(before)
  })
})
