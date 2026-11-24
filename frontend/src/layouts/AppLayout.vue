<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { ChevronDown, ChevronRight, ChevronUp, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { MENU_ITEMS } from '@/config/menu'
import { useAuthStore } from '@/stores/auth'
import { useNavStore } from '@/stores/nav'
import { cn } from '@/lib/utils'
import { useResizableWidth } from '@/composables/useResizableWidth'
import {
  loadSidebarCollapsed,
  saveSidebarCollapsed,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_WIDTH_KEY,
} from '@/lib/sidebar'

const router = useRouter()
const auth = useAuthStore()
const nav = useNavStore()

const sidebar = useResizableWidth({
  storageKey: SIDEBAR_WIDTH_KEY,
  defaultWidth: SIDEBAR_DEFAULT_WIDTH,
  minWidth: SIDEBAR_MIN_WIDTH,
  maxWidth: SIDEBAR_MAX_WIDTH,
})
const sidebarWidth = sidebar.width
const resizing = sidebar.resizing

const collapsed = ref(loadSidebarCollapsed())
const menuOpen = ref(false)
const accountMenuRef = ref<HTMLElement | null>(null)

const asideWidth = computed(() => (collapsed.value ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth.value))
const avatarInitial = computed(() => {
  const name = (auth.nickname || auth.username || '?').trim()
  return Array.from(name)[0]?.toUpperCase() ?? '?'
})

function startResize(event: PointerEvent): void {
  if (!collapsed.value) {
    sidebar.startResize(event)
  }
}

function resetWidth(): void {
  if (!collapsed.value) {
    sidebar.resetWidth()
  }
}

function onHandleKeydown(event: KeyboardEvent): void {
  if (!collapsed.value) {
    sidebar.onHandleKeydown(event)
  }
}

function toggleCollapsed(): void {
  collapsed.value = !collapsed.value
  menuOpen.value = false
  saveSidebarCollapsed(collapsed.value)
}

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value
}

async function goHome(): Promise<void> {
  nav.select(MENU_ITEMS[0].key)
  if (router.currentRoute.value.name !== 'home') {
    await router.replace('/')
  }
}

function onDocumentPointerDown(event: PointerEvent): void {
  const target = event.target as Node | null
  if (accountMenuRef.value && target && accountMenuRef.value.contains(target)) {
    return
  }
  menuOpen.value = false
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    menuOpen.value = false
  }
}

watch(menuOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', onDocumentPointerDown)
    document.addEventListener('keydown', onDocumentKeydown)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointerDown)
    document.removeEventListener('keydown', onDocumentKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})

async function handleLogout(): Promise<void> {
  menuOpen.value = false
  // 不等待服务端响应，先回登录页；作废会话的请求在后台完成。
  const pending = auth.logout()
  await router.replace('/login')
  await pending
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
    <aside
      class="relative flex h-full shrink-0 flex-col border-r border-slate-200 bg-white"
      :class="!resizing && 'transition-[width] duration-150 ease-out'"
      :style="{ width: `${asideWidth}px` }"
    >
      <div
        class="flex h-10 shrink-0 items-center px-4"
        :class="collapsed && 'justify-center px-0'"
      >
        <span
          v-if="!collapsed"
          class="truncate text-sm font-semibold tracking-wide"
        >Harness Agent</span>
        <span
          v-else
          class="text-base font-semibold tracking-tight"
        >HA</span>
      </div>

      <nav
        class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3"
        :class="collapsed && 'items-center px-2'"
        aria-label="主导航"
      >
        <button
          v-for="item in MENU_ITEMS"
          :key="item.key"
          type="button"
          :aria-current="nav.activeKey === item.key ? 'page' : undefined"
          :aria-label="item.label"
          :title="collapsed ? item.label : undefined"
          :class="cn(
            'relative flex h-9 shrink-0 items-center gap-2 rounded-lg text-sm transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            collapsed ? 'w-10 justify-center px-0' : 'w-full px-3',
            nav.activeKey === item.key
              ? 'bg-blue-50 font-medium text-blue-800'
              : 'text-slate-700 hover:bg-slate-100',
          )"
          @click="nav.select(item.key)"
        >
          <span
            v-if="nav.activeKey === item.key && !collapsed"
            class="absolute left-0 top-1.5 h-6 w-0.5 rounded-full bg-blue-600"
            aria-hidden="true"
          />
          <component
            :is="item.icon"
            class="h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <span
            v-if="!collapsed"
            class="truncate"
          >{{ item.label }}</span>
        </button>
      </nav>

      <div
        class="shrink-0 border-t border-slate-200 p-2"
      >
        <div
          ref="accountMenuRef"
          class="relative"
          :class="collapsed ? 'flex justify-center' : 'min-w-0'"
        >
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg p-1.5 text-left transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :class="collapsed ? 'w-10 justify-center' : 'w-full'"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            :aria-label="collapsed ? '账号菜单' : undefined"
            :title="collapsed ? '账号菜单' : undefined"
            @click="toggleMenu()"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700">
              {{ avatarInitial }}
            </span>
            <span
              v-if="!collapsed"
              class="min-w-0 flex-1"
            >
              <span class="block truncate text-sm text-slate-700">
                {{ auth.nickname || auth.username }}
              </span>
              <span class="block truncate text-xs text-slate-500">@{{ auth.username }}</span>
            </span>
            <ChevronUp
              v-if="!collapsed && menuOpen"
              class="h-4 w-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <ChevronDown
              v-else-if="!collapsed"
              class="h-4 w-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </button>

          <div
            v-if="menuOpen"
            role="menu"
            aria-label="账号菜单"
            class="absolute z-20 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-md"
            :class="collapsed ? 'bottom-0 left-full ml-3' : 'bottom-full left-0 right-0 mb-1'"
          >
            <button
              type="button"
              role="menuitem"
              class="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              @click="handleLogout()"
            >
              <LogOut
                class="h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              退出
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="!collapsed"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整侧栏宽度"
        :aria-valuemin="SIDEBAR_MIN_WIDTH"
        :aria-valuemax="SIDEBAR_MAX_WIDTH"
        :aria-valuenow="sidebarWidth"
        tabindex="0"
        :class="cn(
          'absolute inset-y-0 right-0 w-1 cursor-col-resize touch-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          resizing ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-200',
        )"
        @pointerdown="startResize"
        @dblclick="resetWidth()"
        @keydown="onHandleKeydown"
      />
    </aside>

    <main class="flex min-w-0 flex-1 flex-col">
      <div class="shrink-0 border-b border-slate-200 bg-white">
        <div class="flex h-10 items-center gap-2 px-4">
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
            :aria-expanded="!collapsed"
            :title="collapsed ? '展开侧栏' : '收起侧栏'"
            @click="toggleCollapsed()"
          >
            <PanelLeftOpen
              v-if="collapsed"
              class="h-5 w-5"
              aria-hidden="true"
            />
            <PanelLeftClose
              v-else
              class="h-5 w-5"
              aria-hidden="true"
            />
          </button>

          <span
            class="h-4 w-px shrink-0 bg-slate-200"
            aria-hidden="true"
          />

          <nav
            class="min-w-0"
            aria-label="面包屑"
          >
            <ol class="flex min-w-0 items-center gap-2 text-sm">
              <li class="shrink-0">
                <button
                  type="button"
                  class="flex h-7 items-center rounded-md px-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  @click="goHome()"
                >
                  首页
                </button>
              </li>
              <li
                class="flex shrink-0 items-center"
                aria-hidden="true"
              >
                <ChevronRight class="h-4 w-4 text-slate-400" />
              </li>
              <li class="min-w-0">
                <span
                  class="block truncate px-1 text-slate-900"
                  aria-current="page"
                >{{ nav.activeItem.label }}</span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="px-4 py-4">
          <RouterView />
        </div>
      </div>
    </main>
  </div>
</template>
