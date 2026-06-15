import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/state/authStore'
import { authService } from '@/services/authService'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => {
        const authStore = useAuthStore()
        return authStore.isAuthenticated ? '/workspace' : '/login'
      },
    },
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
    {
      path: '/workspace',
      name: 'workspace',
      component: () => import('@/views/workspace/WorkspaceListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/workspaces/:workspaceId/dashboard',
      name: 'workspace-dashboard',
      component: () => import('@/views/workspace/WorkspaceDashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/workspaces/:workspaceId/tasks',
      name: 'workspace-tasks',
      component: () => import('@/views/task/TaskListView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/profile',
      name: 'settings-profile',
      component: () => import('@/views/settings/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/workspaces/:workspaceId/schedule',
      name: 'workspace-schedule',
      component: () => import('@/views/schedule/ScheduleView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  // 새로고침 등으로 토큰은 있지만 본인 정보가 비어있는 경우 채워둔다. (Host 판별에 사용)
  if (authStore.isAuthenticated && !authStore.currentUser) {
    await authService.fetchCurrentUser()
  }
})

export default router
