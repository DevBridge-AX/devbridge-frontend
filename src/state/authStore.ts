import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TOKEN_KEY = 'accessToken'

// ─── Layer 2: Global Auth State (Pinia) ───────────────────────────────────
// 순수 메모리 상태만 관리합니다. api 직접 호출 금지.

export const useAuthStore = defineStore('auth', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const accessToken = ref<string | null>(localStorage.getItem(TOKEN_KEY))

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
   * 로그아웃: 상태와 localStorage에서 토큰을 제거합니다.
   */
  function logout(): void {
    accessToken.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return {
    accessToken,
    isAuthenticated,
    setToken,
    logout,
  }
})
