import axios from 'axios'
import { workspaceApi } from '@/api/workspaceApi'
import type { Workspace } from '@/api/workspaceApi'
import type { WorkspaceMemberResponse } from '@/api/workspaceApi'

async function getMyWorkspaces(): Promise<Workspace[]> {
  try {
    return await workspaceApi.fetchMyWorkspaces()
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('워크스페이스 목록을 조회할 권한이 없습니다.')
      }
    }

    throw new Error('워크스페이스 목록을 불러오지 못했습니다.')
  }
}

async function updateWorkspaceAccess(workspaceId: string): Promise<void> {
  try {
    await workspaceApi.updateWorkspaceAccess(workspaceId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403 || status === 404) {
        throw new Error('해당 워크스페이스에 접근할 수 없습니다.')
      }
    }

    throw new Error('워크스페이스 접속 정보를 갱신하지 못했습니다.')
  }
}

async function searchMembers(keyword: string): Promise<WorkspaceMemberResponse[]> {
  try {
    return await workspaceApi.searchMembers(keyword)
  } catch (error: unknown) {
    console.error('[workspaceService] 멤버 검색 실패:', error)
    return []
  }
}

export const workspaceService = {
  getMyWorkspaces,
  updateWorkspaceAccess,
  searchMembers,
}
