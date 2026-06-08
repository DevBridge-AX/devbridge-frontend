import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/state/authStore'

// ─── 라우팅 메타 타입 확장 ─────────────────────────────────────────────────
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── 루트: 미인증이면 /login, 인증이면 /workspace로 분기 ──────────────
    {
      path: '/',
      redirect: () => {
        const authStore = useAuthStore()
        return authStore.isAuthenticated ? '/workspace' : '/login'
      },
    },
    // ── 인증 불필요 (Guest) ──────────────────────────────────────────────
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('@/views/auth/SignupView.vue'),
    },
    // ── 인증 필요 (Protected) ────────────────────────────────────────────
    {
      path: '/workspace',
      name: 'workspace',
      component: () => import('@/views/workspace/WorkspaceListView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// ─── Navigation Guard: 미인증 사용자 /login 리다이렉트 ──────────────────────
router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }
})

export default router
