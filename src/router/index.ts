import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/state/authStore'
import { useWorkspaceStore } from '@/state/workspaceStore'
import { authService } from '@/services/authService'
import { toSafeRedirect } from '@/router/redirect'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

export const routes: RouteRecordRaw[] = [
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
    path: '/workspaces/:workspaceId/documents',
    name: 'workspace-documents',
    component: () => import('@/views/document/DocumentsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/workspaces/:workspaceId/chat',
    name: 'workspace-chat',
    component: () => import('@/views/chat/ChatView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/workspaces/:workspaceId/datasources',
    name: 'workspace-datasources',
    component: () => import('@/views/dataSource/DataSourceView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/workspaces/:workspaceId/schedule',
    name: 'workspace-schedule',
    component: () => import('@/views/schedule/ScheduleView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings/profile',
    name: 'settings-profile',
    component: () => import('@/views/settings/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * 인증 가드: 미인증 접근 차단, 로그인 상태의 로그인/회원가입 접근 우회, 워크스페이스 ID 동기화.
 */
export async function authGuard(to: RouteLocationNormalized): Promise<RouteLocationRaw | undefined> {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (authStore.isAuthenticated && (to.name === 'login' || to.name === 'signup')) {
    return toSafeRedirect(to.query.redirect) ?? { name: 'workspace' }
  }

  const workspaceId = to.params.workspaceId
  if (workspaceId && !Array.isArray(workspaceId)) {
    const workspaceStore = useWorkspaceStore()
    workspaceStore.setWorkspaceId(workspaceId)
  } else if (to.path.startsWith('/workspaces/') && !workspaceId) {
    return { name: 'workspace' }
  }

  if (authStore.isAuthenticated && !authStore.currentUser) {
    await authService.fetchCurrentUser()
  }

  return undefined
}

router.beforeEach(authGuard)

export default router
