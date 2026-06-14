import { workspaceApi } from '@/api/workspaceApi'
import type { WorkspaceMemberResponse } from '@/api/workspaceApi'

// ─── Layer 3: 비즈니스 로직 (Service) ─────────────────────────────────────
// workspaceApi를 호출하고 예외 발생 시 안전하게 복구합니다.

/**
 * 워크스페이스 내 멤버를 이름 키워드로 검색합니다.
 */
async function searchMembers(keyword: string): Promise<WorkspaceMemberResponse[]> {
  try {
    return await workspaceApi.searchMembers(keyword)
  } catch (error: unknown) {
    console.error('[workspaceService] 멤버 검색 실패:', error)
    return []
  }
}

export const workspaceService = {
  searchMembers,
}
