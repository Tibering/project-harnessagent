<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookOpen, Database, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { MENU_ITEMS } from '@/config/menu'
import { COMPONENT_DOCS, type ComponentDoc } from '@/config/docs'
import Badge from '@/components/ui/badge/Badge.vue'
import FileDdlView from '@/components/home/docs/FileDdlView.vue'
import { cn } from '@/lib/utils'
import { useResizableWidth } from '@/composables/useResizableWidth'
import fileSchema from '../../../../docs/db/file/schema.sql?raw'

const HOME_KEY = 'home'
const DDL_KEY = 'file-ddl'
const COLLAPSED_KEY = 'harness-agent.docs-nav-collapsed'

const activeKey = ref<string>(HOME_KEY)

const docsNavCollapsed = ref(loadCollapsed())

function loadCollapsed(): boolean {
  if (typeof localStorage === 'undefined') {
    return false
  }
  return localStorage.getItem(COLLAPSED_KEY) === 'true'
}

function toggleDocsNav(): void {
  docsNavCollapsed.value = !docsNavCollapsed.value
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(COLLAPSED_KEY, String(docsNavCollapsed.value))
  }
}

const {
  width: navWidth,
  resizing: navResizing,
  minWidth: navMinWidth,
  maxWidth: navMaxWidth,
  startResize: startNavResize,
  resetWidth: resetNavWidth,
  onHandleKeydown: onNavHandleKeydown,
} = useResizableWidth({
  storageKey: 'harness-agent.docs-nav-width',
  defaultWidth: 200,
  minWidth: 160,
  maxWidth: 320,
})

const entries = computed(() => [
  { key: HOME_KEY, label: '文档首页', icon: BookOpen },
  ...MENU_ITEMS
    .filter((item) => item.key !== 'docs')
    .map((item) => ({ key: item.key, label: item.label, icon: item.icon })),
  { key: DDL_KEY, label: '文件 DDL', icon: Database },
])

const activeEntry = computed(() => entries.value.find((entry) => entry.key === activeKey.value))

const activeDoc = computed<ComponentDoc | undefined>(() =>
  COMPONENT_DOCS.find((doc) => doc.key === activeKey.value),
)

function statusOf(doc?: ComponentDoc): { label: string; tone: 'info' | 'neutral' | 'warning' } {
  if (!doc) {
    return { label: '待补充', tone: 'warning' }
  }
  if (doc.status === 'ready') {
    return { label: '已接入', tone: 'info' }
  }
  if (doc.status === 'prototype') {
    return { label: '原型', tone: 'neutral' }
  }
  return { label: '占位', tone: 'neutral' }
}
</script>

<template>
  <section>
    <header class="mb-4">
      <h1 class="text-2xl font-semibold tracking-tight">
        文档
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        首页各业务组件的用途、展示内容与依赖接口。
      </p>
    </header>

    <div
      class="grid grid-cols-1 items-start gap-4 md:grid-cols-[var(--docs-nav-width)_minmax(0,1fr)]"
      :style="{ '--docs-nav-width': docsNavCollapsed ? '56px' : `${navWidth}px` }"
    >
      <nav
        class="relative rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
        :class="docsNavCollapsed ? 'hidden md:flex md:flex-col md:items-center md:px-1.5' : 'flex flex-col'"
        aria-label="文档目录"
      >
        <ul
          class="w-full space-y-0.5"
          :class="docsNavCollapsed && 'flex flex-col items-center'"
        >
          <li
            v-for="entry in entries"
            :key="entry.key"
            class="w-full"
            :class="docsNavCollapsed && 'flex justify-center'"
          >
            <button
              type="button"
              :aria-current="activeKey === entry.key ? 'page' : undefined"
              :aria-label="entry.label"
              :title="docsNavCollapsed ? entry.label : undefined"
              :class="cn(
                'relative flex h-9 items-center gap-2 rounded-lg text-sm transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                docsNavCollapsed ? 'w-10 justify-center px-0' : 'w-full px-3',
                activeKey === entry.key
                  ? 'bg-blue-50 font-medium text-blue-800'
                  : 'text-slate-700 hover:bg-slate-100',
              )"
              @click="activeKey = entry.key"
            >
              <span
                v-if="activeKey === entry.key && !docsNavCollapsed"
                class="absolute left-0 top-1.5 h-6 w-0.5 rounded-full bg-blue-600"
                aria-hidden="true"
              />
              <component
                :is="entry.icon"
                class="h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <span
                v-if="!docsNavCollapsed"
                class="truncate"
              >{{ entry.label }}</span>
            </button>
          </li>
        </ul>

        <div
          class="mt-2 w-full border-t border-slate-200 pt-2"
          :class="docsNavCollapsed && 'flex justify-center'"
        >
          <button
            type="button"
            class="flex h-9 items-center gap-2 rounded-lg text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :class="docsNavCollapsed ? 'w-10 justify-center px-0' : 'w-full px-3'"
            :aria-label="docsNavCollapsed ? '展开文档目录' : '收起文档目录'"
            :aria-expanded="!docsNavCollapsed"
            :title="docsNavCollapsed ? '展开文档目录' : '收起文档目录'"
            @click="toggleDocsNav()"
          >
            <PanelLeftOpen
              v-if="docsNavCollapsed"
              class="h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <PanelLeftClose
              v-else
              class="h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <span
              v-if="!docsNavCollapsed"
              class="truncate"
            >收起目录</span>
          </button>
        </div>

        <div
          v-if="!docsNavCollapsed"
          role="separator"
          aria-orientation="vertical"
          aria-label="调整文档目录宽度"
          :aria-valuemin="navMinWidth"
          :aria-valuemax="navMaxWidth"
          :aria-valuenow="navWidth"
          tabindex="0"
          :class="cn(
            'absolute inset-y-0 right-0 hidden w-1 cursor-col-resize touch-none rounded-full md:block',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            navResizing ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-200',
          )"
          @pointerdown="startNavResize"
          @dblclick="resetNavWidth()"
          @keydown="onNavHandleKeydown"
        />
      </nav>

      <article
        v-if="activeKey === HOME_KEY"
        class="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 class="text-xl font-semibold">
          文档首页
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-700">
          首页是一个单体壳：所有业务组件都渲染在 <code class="rounded bg-slate-100 px-1 font-mono text-xs">HomePage</code>
          里，通过左侧菜单切换，URL 不变。左栏是文档目录，右栏是选中条目的说明。
        </p>

        <h3 class="mt-6 text-sm font-semibold">
          首页各部分的耦合关系
        </h3>
        <ul class="mt-2 space-y-2">
          <li class="flex gap-2 text-sm leading-6 text-slate-700">
            <span
              class="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400"
              aria-hidden="true"
            />
            <span>
              <strong class="font-medium">菜单 → 内容</strong>：<code class="rounded bg-slate-100 px-1 font-mono text-xs">config/menu.ts</code>
              是唯一注册点，选中项存在 Pinia 的 <code class="rounded bg-slate-100 px-1 font-mono text-xs">useNavStore.activeKey</code>，
              <code class="rounded bg-slate-100 px-1 font-mono text-xs">HomePage</code> 按 key 渲染对应组件；刷新回到第一个菜单项。
            </span>
          </li>
          <li class="flex gap-2 text-sm leading-6 text-slate-700">
            <span
              class="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400"
              aria-hidden="true"
            />
            <span>
              <strong class="font-medium">面包栏 → 菜单</strong>：面包栏在 <code class="rounded bg-slate-100 px-1 font-mono text-xs">AppLayout</code> 里，
              当前项读同一个 store，点「首页」会切回第一个菜单项，不额外维护一套标题。
            </span>
          </li>
          <li class="flex gap-2 text-sm leading-6 text-slate-700">
            <span
              class="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400"
              aria-hidden="true"
            />
            <span>
              <strong class="font-medium">文档 → 菜单</strong>：<code class="rounded bg-slate-100 px-1 font-mono text-xs">config/docs.ts</code>
              用菜单 key 关联说明，目录由菜单项自动生成；漏写说明时显示「待补充」，并由
              <code class="rounded bg-slate-100 px-1 font-mono text-xs">docs.spec.ts</code> 断言覆盖。
            </span>
          </li>
          <li class="flex gap-2 text-sm leading-6 text-slate-700">
            <span
              class="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400"
              aria-hidden="true"
            />
            <span>
              <strong class="font-medium">组件之间</strong>：业务组件互不引用，只依赖路由壳、Pinia 与
              <code class="rounded bg-slate-100 px-1 font-mono text-xs">lib/http</code>；
              身份头与 401 跳转统一由请求拦截器处理，组件内不各自实现。
            </span>
          </li>
        </ul>

        <h3 class="mt-6 text-sm font-semibold">
          新增一个业务组件
        </h3>
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
          <li>在 <code class="rounded bg-slate-100 px-1 font-mono text-xs">components/home/</code> 新建面板组件。</li>
          <li>在 <code class="rounded bg-slate-100 px-1 font-mono text-xs">config/menu.ts</code> 加一项（key、label、icon、component）。</li>
          <li>在 <code class="rounded bg-slate-100 px-1 font-mono text-xs">config/docs.ts</code> 补该 key 的说明、展示内容与依赖接口。</li>
          <li>跑 <code class="rounded bg-slate-100 px-1 font-mono text-xs">pnpm test</code>，覆盖校验会拦住漏写的说明。</li>
        </ol>
      </article>

      <article
        v-else-if="activeKey === DDL_KEY"
        class="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <FileDdlView :sql="fileSchema" />
      </article>

      <article
        v-else
        class="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <component
              :is="activeEntry?.icon"
              class="h-5 w-5 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <h2 class="truncate text-xl font-semibold">
              {{ activeEntry?.label }}
            </h2>
          </div>
          <Badge :tone="statusOf(activeDoc).tone">
            {{ statusOf(activeDoc).label }}
          </Badge>
        </div>

        <p class="mt-1 text-xs text-slate-500">
          菜单 key：{{ activeKey }}
        </p>

        <p class="mt-3 text-sm leading-6 text-slate-700">
          {{ activeDoc?.summary ?? '尚未补充说明。' }}
        </p>

        <div
          v-if="activeDoc"
          class="mt-5"
        >
          <h3 class="text-sm font-semibold">
            展示内容
          </h3>
          <ul class="mt-2 space-y-1">
            <li
              v-for="detail in activeDoc.details"
              :key="detail"
              class="flex gap-2 text-sm leading-6 text-slate-700"
            >
              <span
                class="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400"
                aria-hidden="true"
              />
              <span>{{ detail }}</span>
            </li>
          </ul>
        </div>

        <div class="mt-5">
          <h3 class="text-sm font-semibold">
            依赖接口
          </h3>
          <ul
            v-if="activeDoc?.apis.length"
            class="mt-2 space-y-1"
          >
            <li
              v-for="api in activeDoc.apis"
              :key="`${api.method} ${api.path}`"
              class="flex flex-wrap items-center gap-2 text-sm"
            >
              <span class="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                {{ api.method }}
              </span>
              <code class="font-mono text-xs text-slate-700">{{ api.path }}</code>
              <span
                v-if="api.note"
                class="text-xs text-slate-500"
              >{{ api.note }}</span>
            </li>
          </ul>
          <p
            v-else
            class="mt-2 text-sm text-slate-500"
          >
            不依赖后端接口。
          </p>
        </div>

        <p
          v-if="activeDoc?.note"
          class="mt-5 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500"
        >
          {{ activeDoc.note }}
        </p>

        <div class="mt-5 border-t border-slate-200 pt-3">
          <button
            type="button"
            class="flex h-8 items-center rounded-md px-2 text-sm text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            @click="activeKey = HOME_KEY"
          >
            返回文档首页
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
