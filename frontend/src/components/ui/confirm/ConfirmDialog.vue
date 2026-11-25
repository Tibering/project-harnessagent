<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmText?: string
  }>(),
  { confirmText: '确认' },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const panelRef = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('cancel')
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      lastFocused = document.activeElement as HTMLElement | null
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      panelRef.value?.querySelector<HTMLElement>('button')?.focus()
    } else {
      window.removeEventListener('keydown', onKeydown)
      lastFocused?.focus()
      lastFocused = null
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
    @click="emit('cancel')"
  >
    <div
      ref="panelRef"
      tabindex="-1"
      class="w-full max-w-[400px] rounded-xl border border-slate-200 bg-white p-6 shadow-md focus:outline-none"
      role="alertdialog"
      aria-modal="true"
      :aria-label="title"
      @click.stop
    >
      <h2 class="text-xl font-semibold">
        {{ title }}
      </h2>
      <p class="mt-2 text-sm leading-6 text-slate-700">
        {{ message }}
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          @click="emit('cancel')"
        >
          取消
        </Button>
        <Button
          variant="danger"
          size="sm"
          @click="emit('confirm')"
        >
          {{ confirmText }}
        </Button>
      </div>
    </div>
  </div>
</template>
