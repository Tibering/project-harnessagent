import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { http, type ApiEnvelope } from '@/lib/http'
import { clearIdentity, loadIdentity, saveIdentity, type StoredIdentity } from '@/lib/identity'

interface SessionUser {
  id: string
  username: string
  nickname: string
}

interface SessionResponse {
  userId: string
  sessionId: string
  user: SessionUser
}

export const useAuthStore = defineStore('auth', () => {
  const identity = ref<StoredIdentity | null>(loadIdentity())

  const isAuthenticated = computed(() => identity.value !== null)
  const nickname = computed(() => identity.value?.nickname ?? '')
  const username = computed(() => identity.value?.username ?? '')

  async function login(inputUsername: string, inputNickname: string): Promise<void> {
    const { data } = await http.post<ApiEnvelope<SessionResponse>>('/experience/session', {
      username: inputUsername,
      nickname: inputNickname,
    })

    const session = data.data
    const next: StoredIdentity = {
      userId: session.userId,
      sessionId: session.sessionId,
      username: session.user.username,
      nickname: session.user.nickname,
    }
    saveIdentity(next)
    identity.value = next
  }

  async function logout(): Promise<void> {
    // 先清本地身份，退出流程不依赖网络是否可达。
    const current = identity.value
    forget()
    if (!current) {
      return
    }

    try {
      // 本地身份已清空，请求头显式带上，避免拦截器读不到。
      await http.delete('/experience/session', {
        headers: {
          'X-User-Id': current.userId,
          'X-Session-Id': current.sessionId,
        },
        timeout: 5_000,
      })
    } catch {
      // 服务端不可达或会话已失效，本地已经退出，不阻塞跳转。
    }
  }

  function forget(): void {
    clearIdentity()
    identity.value = null
  }

  return { identity, isAuthenticated, nickname, username, login, logout, forget }
})
