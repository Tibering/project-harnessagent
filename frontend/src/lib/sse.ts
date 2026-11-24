export type SseListener = (data: unknown) => void

export interface SseOptions {
  events?: string[]
  withCredentials?: boolean
  onOpen?: () => void
  onError?: (event: Event) => void
}

/**
 * 订阅后端 SSE 流。返回取消订阅的函数。
 * 事件名与后端约定一一对应，未命名事件走 message 通道。
 */
export function subscribeSse(
  path: string,
  listeners: Record<string, SseListener>,
  options: SseOptions = {},
): () => void {
  const source = new EventSource(path, {
    withCredentials: options.withCredentials ?? true,
  })

  const dispatch = (name: string) => (event: MessageEvent<string>) => {
    const listener = listeners[name]
    if (!listener) {
      return
    }
    try {
      listener(event.data ? JSON.parse(event.data) : null)
    } catch {
      listener(event.data)
    }
  }

  const names = options.events ?? Object.keys(listeners)
  names.forEach((name) => source.addEventListener(name, dispatch(name) as EventListener))

  if (options.onOpen) {
    source.onopen = options.onOpen
  }
  if (options.onError) {
    source.onerror = options.onError
  }

  return () => source.close()
}
