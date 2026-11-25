<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    page: number
    total: number
    pageSize?: number
  }>(),
  { pageSize: 10 },
)

const emit = defineEmits<{ 'update:page': [page: number] }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const pages = computed(() => {
  const count = totalPages.value
  if (count <= 7) {
    return Array.from({ length: count }, (_, i) => i + 1)
  }
  const start = Math.max(1, Math.min(props.page - 3, count - 6))
  return Array.from({ length: 7 }, (_, i) => start + i)
})

function go(target: number): void {
  const next = Math.min(totalPages.value, Math.max(1, target))
  if (next !== props.page) {
    emit('update:page', next)
  }
}
</script>

<template>
  <nav
    class="flex items-center gap-1"
    aria-label="分页"
  >
    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors duration-150 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      :disabled="page <= 1"
      aria-label="上一页"
      @click="go(page - 1)"
    >
      <ChevronLeft
        class="h-4 w-4"
        aria-hidden="true"
      />
    </button>

    <button
      v-for="item in pages"
      :key="item"
      type="button"
      :aria-current="item === page ? 'page' : undefined"
      :class="cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        item === page
          ? 'bg-blue-600 text-white'
          : 'text-slate-600 hover:bg-slate-100',
      )"
      @click="go(item)"
    >
      {{ item }}
    </button>

    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors duration-150 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      :disabled="page >= totalPages"
      aria-label="下一页"
      @click="go(page + 1)"
    >
      <ChevronRight
        class="h-4 w-4"
        aria-hidden="true"
      />
    </button>
  </nav>
</template>
