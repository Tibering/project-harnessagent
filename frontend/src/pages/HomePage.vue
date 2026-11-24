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
  <section class="rounded-xl border border-slate-200 bg-white p-6">
    <h1 class="text-lg font-semibold">
      骨架就绪
    </h1>
    <p class="mt-2 text-sm text-slate-600">
      前端、后端、数据库三处连通后，这个页面会显示后端健康状态。
    </p>

    <div class="mt-6 flex items-center gap-3">
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
        class="text-sm text-red-600"
      >
        后端未连通：{{ (error as Error).message }}
      </span>
      <span
        v-else
        class="text-sm text-emerald-600"
      >后端状态：{{ data?.status }}</span>
    </div>
  </section>
</template>
