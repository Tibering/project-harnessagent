import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type RouterHistory,
} from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { hasIdentity } from '@/lib/identity'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/pages/HomePage.vue'),
      },
    ],
  },
  {
    // 未匹配的路径直接渲染 404，保留原始 URL。
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { public: true },
  },
]

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({ history, routes })

  router.beforeEach((to) => {
    const authenticated = hasIdentity()

    if (!authenticated && !to.meta.public) {
      return { name: 'login' }
    }
    if (authenticated && to.name === 'login') {
      return { name: 'home' }
    }
    return true
  })

  return router
}
