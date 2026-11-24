import { onBeforeUnmount, ref } from 'vue'

export interface ResizableWidthOptions {
  /** localStorage 里保存宽度的 key。 */
  storageKey: string
  defaultWidth: number
  minWidth: number
  maxWidth: number
}

/**
 * 可拖拽调宽的一列：右侧边缘拖动、方向键微调、双击复位，宽度写入 localStorage。
 */
export function useResizableWidth(options: ResizableWidthOptions) {
  const { storageKey, defaultWidth, minWidth, maxWidth } = options

  const width = ref(loadWidth())
  const resizing = ref(false)

  let startX = 0
  let startWidth = 0

  function clamp(value: number): number {
    return Math.min(maxWidth, Math.max(minWidth, Math.round(value)))
  }

  function loadWidth(): number {
    if (typeof localStorage === 'undefined') {
      return defaultWidth
    }
    const raw = localStorage.getItem(storageKey)
    if (raw === null) {
      return defaultWidth
    }
    const parsed = Number.parseInt(raw, 10)
    return Number.isNaN(parsed) ? defaultWidth : clamp(parsed)
  }

  function saveWidth(): void {
    if (typeof localStorage === 'undefined') {
      return
    }
    localStorage.setItem(storageKey, String(clamp(width.value)))
  }

  function onPointerMove(event: PointerEvent): void {
    width.value = clamp(startWidth + event.clientX - startX)
  }

  function stopResize(): void {
    resizing.value = false
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopResize)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    saveWidth()
  }

  function startResize(event: PointerEvent): void {
    if (event.button !== 0) {
      return
    }
    resizing.value = true
    startX = event.clientX
    startWidth = width.value
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', stopResize)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }

  function resetWidth(): void {
    width.value = defaultWidth
    saveWidth()
  }

  function onHandleKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 24 : 8
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      width.value = clamp(width.value - step)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      width.value = clamp(width.value + step)
    } else if (event.key === 'Home') {
      event.preventDefault()
      resetWidth()
      return
    } else {
      return
    }
    saveWidth()
  }

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopResize)
  })

  return {
    width,
    resizing,
    minWidth,
    maxWidth,
    startResize,
    resetWidth,
    onHandleKeydown,
    clamp,
  }
}
