import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CurrentUserResponse } from '@/api/authApi'

const TOKEN_KEY = 'accessToken'

// ─── Layer 2: Global Auth State (Pinia) ───────────────────────────────────
// 순수 메모리 상태만 관리합니다. api 직접 호출 금지.

export const useAuthStore = defineStore('auth', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const accessToken = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const currentUser = ref<CurrentUserResponse | null>(null)

  // ── Getters ────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => accessToken.value !== null)

  // ── Actions ────────────────────────────────────────────────────────────

  /**
   * 로그인 성공 후 토큰을 상태와 localStorage에 저장합니다.
   */
  function setToken(token: string): void {
    accessToken.value = token
    localStorage.setItem(TOKEN_KEY, token)
  }

  /**
   * 로그인한 본인 정보를 저장합니다. (employeeId 기반 Host 판별 등에 사용)
   */
  function setCurrentUser(user: CurrentUserResponse): void {
    currentUser.value = user
  }

  /**
   * 로그아웃: 상태와 localStorage에서 토큰을 제거합니다.
   */
  function logout(): void {
    accessToken.value = null
    currentUser.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return {
    accessToken,
    currentUser,
    isAuthenticated,
    setToken,
    setCurrentUser,
    logout,
  }
})
