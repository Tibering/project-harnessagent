<script setup lang="ts">
import { useRouter } from 'vue-router'
import { CircleAlert } from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
    <div class="w-full max-w-[400px] rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <CircleAlert
        class="mx-auto h-6 w-6 text-slate-400"
        aria-hidden="true"
      />
      <h1 class="mt-3 text-2xl font-semibold tracking-tight">
        页面不存在
      </h1>
      <p class="mt-1 text-sm leading-6 text-slate-500">
        地址可能输入有误，或该页面已被移除。
      </p>

      <div class="mt-6 flex justify-center gap-3">
        <Button
          size="sm"
          @click="router.replace('/')"
        >
          返回首页
        </Button>
        <Button
          v-if="!auth.isAuthenticated"
          variant="secondary"
          size="sm"
          @click="router.replace('/login')"
        >
          去登录
        </Button>
      </div>
    </div>
  </div>
</template>
