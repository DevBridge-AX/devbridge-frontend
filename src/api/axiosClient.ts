import axios from 'axios'
import { WORKSPACE_ID_KEY, DUMMY_WORKSPACE_ID } from '@/state/workspaceStore'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request Interceptor ───────────────────────────────────────────────────
// 모든 요청 헤더에 JWT 토큰을 자동 삽입.
// NOTE: useAuthStore()를 모듈 최상단이 아닌 콜백 내부에서 호출해야
//       Pinia 미초기화 에러를 방지할 수 있음.
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // X-Workspace-Id 헤더 자동 삽입
    // NOTE: 워크스페이스 기능 구현 전까지 DUMMY_WORKSPACE_ID로 대체 (workspaceStore 참고)
    config.headers['X-Workspace-Id'] = localStorage.getItem(WORKSPACE_ID_KEY) ?? DUMMY_WORKSPACE_ID

    // ── 디버그 로그 (토큰 주입 확인용 — 배포 전 제거 예정) ──────────────
    console.log(
      `[Axios Interceptor] ${config.method?.toUpperCase()} ${config.baseURL ?? ''}${config.url ?? ''}`,
    )
    console.log('[Axios Interceptor] localStorage 토큰:', token ? `${token.slice(0, 20)}...` : '없음 ❌')
    console.log('[Axios Interceptor] 요청 헤더:', config.headers)
    // ────────────────────────────────────────────────────────────────────

    return config
  },
  (error: unknown) => Promise.reject(error),
)

// ─── Response Interceptor ──────────────────────────────────────────────────
// 401 Unauthorized 처리: 세션 만료 시 강제 로그아웃 + /login 리다이렉트
//
// - Pinia store: 런타임 콜백 내부에서 호출하므로 초기화 완료 후 실행 보장
// - vue-router: 순환 참조 방지를 위해 window.location 사용
// - 무한 리다이렉트 방지: 이미 /login이면 처리 스킵
axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {

      // 1. localStorage 토큰 즉시 삭제
      localStorage.removeItem('accessToken')

      // 2. Pinia authStore 상태 초기화
      //    (런타임 콜백 내 import: 모듈 로드 시점과 분리되어 순환 참조 없음)
      import('@/state/authStore')
        .then(({ useAuthStore }) => {
          useAuthStore().logout()
        })
        .catch(() => {
          // store 접근 실패 시에도 리다이렉트는 반드시 수행
        })

      // 3. /login이 아닐 때만 알림 & 리다이렉트
      if (!window.location.pathname.startsWith('/login')) {
        alert('세션이 만료되었습니다. 다시 로그인해 주세요.')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default axiosClient
