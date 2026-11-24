<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { http } from '@/lib/http'
import Button from '@/components/ui/button/Button.vue'

interface HealthPayload {
  status: string
}

const { data, isPending, isError, error, refetch } = useQuery({
  queryKey: ['health'],
  queryFn: async () => {
    const { data } = await http.get<HealthPayload>('/actuator/health')
    return data
  },
})
</script>

<template>
  <section>
    <header class="mb-4">
      <h1 class="text-2xl font-semibold tracking-tight">
        概览
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        前端、后端、数据库三处连通后，这里会显示后端健康状态。
      </p>
    </header>

    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 class="text-base font-semibold">
        后端连通性
      </h3>

      <div class="mt-4 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          @click="refetch()"
        >
          重新检测
        </Button>
        <span
          v-if="isPending"
          class="text-sm text-slate-500"
        >检测中…</span>
        <span
          v-else-if="isError"
          class="text-sm text-red-700"
        >
          {{ (error as Error).message }}
        </span>
        <span
          v-else
          class="text-sm text-emerald-700"
        >后端状态：{{ data?.status }}</span>
      </div>
    </div>
  </section>
</template>
