export const SIDEBAR_WIDTH_KEY = 'harness-agent.sidebar-width'
export const SIDEBAR_COLLAPSED_KEY = 'harness-agent.sidebar-collapsed'
export const SIDEBAR_DEFAULT_WIDTH = 240
export const SIDEBAR_MIN_WIDTH = 200
export const SIDEBAR_MAX_WIDTH = 360
export const SIDEBAR_COLLAPSED_WIDTH = 64

export function loadSidebarCollapsed(): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
}
