<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
  }>(),
  { tone: 'neutral' },
)

const classes = computed(() =>
  cn(
    'inline-flex h-5 shrink-0 items-center rounded-md px-2 text-xs font-medium',
    props.tone === 'info' && 'bg-blue-50 text-blue-700',
    props.tone === 'success' && 'bg-emerald-50 text-emerald-700',
    props.tone === 'warning' && 'bg-amber-50 text-amber-700',
    props.tone === 'danger' && 'bg-red-50 text-red-700',
    props.tone === 'neutral' && 'bg-slate-100 text-slate-600',
  ),
)
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
