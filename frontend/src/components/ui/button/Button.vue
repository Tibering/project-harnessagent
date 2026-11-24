<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit'
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    loading: false,
    disabled: false,
  },
)

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
    props.size === 'sm' && 'h-8 px-3',
    props.size === 'md' && 'h-9 px-4',
    props.size === 'lg' && 'h-10 px-5',
    props.variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
    props.variant === 'secondary' && 'border border-slate-500 bg-white text-slate-700 hover:bg-slate-50',
    props.variant === 'ghost' && 'text-slate-700 hover:bg-slate-100',
    props.variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
    props.variant === 'link' && 'text-blue-800 hover:underline',
    props.disabled && 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400',
    !props.disabled && props.loading && 'cursor-progress',
  ),
)

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
  >
    <Loader2
      v-if="loading"
      class="h-4 w-4 shrink-0 animate-spin"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
