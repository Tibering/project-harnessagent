import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from './createAppRouter'
import { clearIdentity, saveIdentity, type StoredIdentity } from '@/lib/identity'

const identity: StoredIdentity = {
  userId: 'user-1',
  sessionId: 'session-1',
  username: 'alice',
  nickname: '爱丽丝',
}

describe('router guard', () => {
  beforeEach(() => {
    clearIdentity()
  })

  it('未登录访问首页时跳到登录页', async () => {
    const router = createAppRouter(createMemoryHistory())

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('已登录访问登录页时回到首页', async () => {
    saveIdentity(identity)
    const router = createAppRouter(createMemoryHistory())

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('未知路径落到 404 页面并保留原始地址', async () => {
    saveIdentity(identity)
    const router = createAppRouter(createMemoryHistory())

    await router.push('/no-such-page')

    expect(router.currentRoute.value.name).toBe('not-found')
    expect(router.currentRoute.value.fullPath).toBe('/no-such-page')
  })
})
