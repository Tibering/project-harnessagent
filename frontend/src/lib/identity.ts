export interface StoredIdentity {
  userId: string
  sessionId: string
  username: string
  nickname: string
}

const STORAGE_KEY = 'harness-agent.identity'

// 无 localStorage 的环境（如单元测试）退化到内存，保证同一进程内可读。
let memory: StoredIdentity | null = null

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}

function isIdentity(value: unknown): value is StoredIdentity {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.userId === 'string'
    && record.userId.length > 0
    && typeof record.sessionId === 'string'
    && record.sessionId.length > 0
    && typeof record.username === 'string'
    && typeof record.nickname === 'string'
  )
}

export function loadIdentity(): StoredIdentity | null {
  const store = storage()
  if (!store) {
    return memory
  }

  const raw = store.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isIdentity(parsed)) {
      store.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    store.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveIdentity(identity: StoredIdentity): void {
  memory = identity
  storage()?.setItem(STORAGE_KEY, JSON.stringify(identity))
}

export function clearIdentity(): void {
  memory = null
  storage()?.removeItem(STORAGE_KEY)
}

export function hasIdentity(): boolean {
  return loadIdentity() !== null
}
