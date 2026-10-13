import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { RouteRecordRaw, Router } from 'vue-router'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/state/authStore'
import { authService } from '@/services/authService'
import { authGuard, routes } from '@/router'

vi.mock('@/services/authService', () => ({
  authService: {
    fetchCurrentUser: vi.fn(() => Promise.resolve()),
  },
}))

const Stub = defineComponent({ render: () => null })

// 지연 로딩 뷰 대신 스텁 컴포넌트를 사용한다 (redirect 라우트는 유지)
const stubRoutes: RouteRecordRaw[] = routes.map((route): RouteRecordRaw =>
  'component' in route && route.component ? { ...route, component: Stub } : route,
)

function createTestRouter(): Router {
  const router = createRouter({ history: createMemoryHistory(), routes: stubRoutes })
  router.beforeEach(authGuard)
  return router
}

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.mocked(authService.fetchCurrentUser).mockClear()
  })

  it('미인증 상태로 보호 경로 접근 시 redirect 쿼리와 함께 로그인으로 이동한다', async () => {
    const router = createTestRouter()

    await router.push('/workspaces/1/tasks')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/workspaces/1/tasks')
  })

  it('인증 상태로 /login 접근 시 workspace로 이동한다', async () => {
    useAuthStore().setToken('t')
    const router = createTestRouter()

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('workspace')
  })

  it('인증 상태에서 안전한 redirect가 있으면 해당 경로로 이동한다', async () => {
    useAuthStore().setToken('t')
    const router = createTestRouter()

    await router.push('/login?redirect=/workspaces/1/tasks')

    expect(router.currentRoute.value.path).toBe('/workspaces/1/tasks')
  })

  it('알 수 없는 경로는 not-found로 해석된다', async () => {
    const router = createTestRouter()

    await router.push('/no/such/path')

    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('인증 상태이고 currentUser가 없으면 fetchCurrentUser를 호출한다', async () => {
    useAuthStore().setToken('t')
    const router = createTestRouter()

    await router.push('/workspace')

    expect(authService.fetchCurrentUser).toHaveBeenCalledTimes(1)
  })
})
