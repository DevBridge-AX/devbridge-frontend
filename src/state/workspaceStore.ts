import { defineStore } from 'pinia'
import { ref } from 'vue'

export const WORKSPACE_ID_KEY = 'currentWorkspaceId'

// ─── Layer 2: Global Workspace State (Pinia) ──────────────────────────────
// 현재 선택된 workspaceId만 관리합니다.
// 임시 워크스페이스 fallback을 사용하지 않습니다.

export const useWorkspaceStore = defineStore('workspace', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const currentWorkspaceId = ref<string | null>(
    localStorage.getItem(WORKSPACE_ID_KEY),
  )

  // ── Actions ────────────────────────────────────────────────────────────

  /**
   * 워크스페이스 선택/전환 시 ID를 상태와 localStorage에 저장합니다.
   */
  function setWorkspaceId(workspaceId: string): void {
    if (!workspaceId || workspaceId.trim() === '') {
      clearWorkspaceId()
      return
    }

    const normalizedWorkspaceId = workspaceId.trim()
    currentWorkspaceId.value = normalizedWorkspaceId
    localStorage.setItem(WORKSPACE_ID_KEY, normalizedWorkspaceId)
  }

  /**
   * 로그아웃 등으로 워크스페이스 컨텍스트를 초기화합니다.
   */
  function clearWorkspaceId(): void {
    currentWorkspaceId.value = null
    localStorage.removeItem(WORKSPACE_ID_KEY)
  }

  return {
    currentWorkspaceId,
    setWorkspaceId,
    clearWorkspaceId,
  }
})
