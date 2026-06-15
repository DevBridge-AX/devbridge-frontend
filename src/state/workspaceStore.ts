import { defineStore } from 'pinia'
import { ref } from 'vue'

export const WORKSPACE_ID_KEY = 'currentWorkspaceId'

// TODO: 워크스페이스 기능(팀원 작업) 완료 후 제거.
// 로그인 → 워크스페이스 자동 연결 흐름이 붙으면 그 시점에서 setWorkspaceId를 호출하도록 연동.
export const DUMMY_WORKSPACE_ID = 'dummy-workspace-id'

// ─── Layer 2: Global Workspace State (Pinia) ──────────────────────────────
// 순수 메모리 상태만 관리합니다. api 직접 호출 금지.

export const useWorkspaceStore = defineStore('workspace', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const currentWorkspaceId = ref<string | null>(
    localStorage.getItem(WORKSPACE_ID_KEY) ?? DUMMY_WORKSPACE_ID,
  )

  // ── Actions ────────────────────────────────────────────────────────────

  /**
   * 워크스페이스 선택/전환 시 ID를 상태와 localStorage에 저장합니다.
   */
  function setWorkspaceId(workspaceId: string): void {
    currentWorkspaceId.value = workspaceId
    localStorage.setItem(WORKSPACE_ID_KEY, workspaceId)
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
