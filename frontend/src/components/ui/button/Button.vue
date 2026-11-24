<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'outline' | 'ghost'
    size?: 'sm' | 'md'
    type?: 'button' | 'submit'
  }>(),
  { variant: 'default', size: 'md', type: 'button' },
)

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50',
    props.size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
    props.variant === 'default' && 'bg-slate-900 text-white hover:bg-slate-800',
    props.variant === 'outline' && 'border border-slate-300 bg-white hover:bg-slate-100',
    props.variant === 'ghost' && 'hover:bg-slate-100',
  ),
)
</script>

<template>
  <button
    :type="type"
    :class="classes"
  >
    <slot />
  </button>
</template>
