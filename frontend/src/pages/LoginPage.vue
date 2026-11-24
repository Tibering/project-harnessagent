<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '@/components/ui/button/Button.vue'
import { ApiError } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const nickname = ref('')
const submitting = ref(false)
const formError = ref('')
const fieldErrors = ref<{ username?: string; nickname?: string }>({})

const inputBase = 'mt-1 h-9 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400'

function validate(): boolean {
  const errors: { username?: string; nickname?: string } = {}
  const name = username.value.trim()
  const nick = nickname.value.trim()

  if (!name) {
    errors.username = '请填写用户名'
  } else if (name.length < 3 || name.length > 32) {
    errors.username = '用户名长度需在 3-32 之间'
  }

  if (!nick) {
    errors.nickname = '请填写昵称'
  } else if (nick.length > 32) {
    errors.nickname = '昵称长度不能超过 32'
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleSubmit(): Promise<void> {
  formError.value = ''
  if (!validate()) {
    return
  }

  submitting.value = true
  try {
    await auth.login(username.value.trim(), nickname.value.trim())
    await router.replace('/')
  } catch (error) {
    formError.value = error instanceof ApiError ? error.message : '进入失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
    <div class="w-full max-w-[400px]">
      <div class="mb-6 text-center">
        <p class="text-sm font-semibold tracking-wide text-blue-800">
          Harness Agent
        </p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight">
          进入工作台
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          体验期身份，无需密码；服务重启后需重新进入。
        </p>
      </div>

      <form
        class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        novalidate
        @submit.prevent="handleSubmit()"
      >
        <div class="space-y-4">
          <div>
            <label
              for="username"
              class="block text-sm font-medium text-slate-700"
            >
              用户名 <span class="text-red-700">*</span>
            </label>
            <input
              id="username"
              v-model="username"
              name="username"
              type="text"
              autocomplete="username"
              autofocus
              maxlength="32"
              placeholder="3-32 位，再次进入会复用同一个用户"
              :disabled="submitting"
              :aria-invalid="Boolean(fieldErrors.username) || undefined"
              :aria-describedby="fieldErrors.username ? 'username-error' : undefined"
              :class="[inputBase, fieldErrors.username ? 'border-red-600' : 'border-slate-500']"
            >
            <p
              v-if="fieldErrors.username"
              id="username-error"
              class="mt-1 text-xs text-red-700"
            >
              {{ fieldErrors.username }}
            </p>
          </div>

          <div>
            <label
              for="nickname"
              class="block text-sm font-medium text-slate-700"
            >
              昵称 <span class="text-red-700">*</span>
            </label>
            <input
              id="nickname"
              v-model="nickname"
              name="nickname"
              type="text"
              autocomplete="nickname"
              maxlength="32"
              placeholder="显示在侧栏，最多 32 个字符"
              :disabled="submitting"
              :aria-invalid="Boolean(fieldErrors.nickname) || undefined"
              :aria-describedby="fieldErrors.nickname ? 'nickname-error' : undefined"
              :class="[inputBase, fieldErrors.nickname ? 'border-red-600' : 'border-slate-500']"
            >
            <p
              v-if="fieldErrors.nickname"
              id="nickname-error"
              class="mt-1 text-xs text-red-700"
            >
              {{ fieldErrors.nickname }}
            </p>
          </div>
        </div>

        <p
          v-if="formError"
          class="mt-4 text-sm text-red-700"
          role="alert"
        >
          {{ formError }}
        </p>

        <Button
          type="submit"
          class="mt-6 w-full"
          :loading="submitting"
        >
          {{ submitting ? '进入中…' : '进入工作台' }}
        </Button>
      </form>
    </div>
  </div>
</template>
