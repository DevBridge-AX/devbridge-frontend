import {
  acceptInvitation,
  createWorkspace,
  fetchCurrentUser,
  fetchMyWorkspaces,
  fetchReceivedInvitations,
  inviteMember,
  searchMembers,
  updateWorkspaceAccess,
  type CreateWorkspacePayload,
  type CurrentUserResponse,
  type InviteMemberPayload,
  type Workspace,
  type WorkspaceInvitation,
  type WorkspaceMemberResponse,
} from '@/api/workspaceApi'
import { WORKSPACE_ID_KEY } from '@/state/workspaceStore'

export const workspaceService = {
  async getCurrentUser(): Promise<CurrentUserResponse> {
    try {
      return await fetchCurrentUser()
    } catch (error) {
      console.error('[WorkspaceService] Failed to fetch current user:', error)
      throw new Error('현재 사용자 정보를 불러오지 못했습니다.')
    }
  },

  async getMyWorkspaces(): Promise<Workspace[]> {
    try {
      return await fetchMyWorkspaces()
    } catch (error) {
      console.error('[WorkspaceService] Failed to fetch workspaces:', error)
      throw new Error('워크스페이스 목록을 불러오지 못했습니다.')
    }
  },

  async createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
    try {
      return await createWorkspace(payload)
    } catch (error) {
      console.error('[WorkspaceService] Failed to create workspace:', error)
      throw new Error('워크스페이스를 생성하지 못했습니다.')
    }
  },

  async inviteMember(
    workspaceId: string,
    payload: InviteMemberPayload,
  ): Promise<void> {
    try {
      await inviteMember(workspaceId, payload)
    } catch (error) {
      console.error(
        '[WorkspaceService] Failed to invite workspace member:',
        error,
      )
      throw new Error('멤버 초대를 생성하지 못했습니다.')
    }
  },

  async getReceivedInvitations(): Promise<WorkspaceInvitation[]> {
    try {
      return await fetchReceivedInvitations()
    } catch (error) {
      console.error(
        '[WorkspaceService] Failed to fetch received invitations:',
        error,
      )
      throw new Error('받은 워크스페이스 초대 목록을 불러오지 못했습니다.')
    }
  },

  async acceptInvitation(invitationId: string): Promise<void> {
    try {
      await acceptInvitation(invitationId)
    } catch (error) {
      console.error('[WorkspaceService] Failed to accept invitation:', error)
      throw new Error('워크스페이스 초대를 수락하지 못했습니다.')
    }
  },

  async updateWorkspaceAccess(workspaceId: string): Promise<void> {
    try {
      await updateWorkspaceAccess(workspaceId)
    } catch (error) {
      console.error(
        '[WorkspaceService] Failed to update workspace access:',
        error,
      )
      throw new Error('워크스페이스 접근 시간을 갱신하지 못했습니다.')
    }
  },

  async searchMembers(
    workspaceIdOrKeyword: string,
    keyword?: string,
  ): Promise<WorkspaceMemberResponse[]> {
    const resolvedWorkspaceId =
      keyword === undefined
        ? localStorage.getItem(WORKSPACE_ID_KEY)
        : workspaceIdOrKeyword

    if (!resolvedWorkspaceId) {
      throw new Error('워크스페이스 정보가 없습니다.')
    }

    const resolvedKeyword =
      keyword === undefined ? workspaceIdOrKeyword : keyword

    if (!resolvedKeyword.trim()) {
      return []
    }

    try {
      return await searchMembers(resolvedWorkspaceId, resolvedKeyword)
    } catch (error) {
      console.error(
        '[WorkspaceService] Failed to search workspace members:',
        error,
      )
      throw new Error('워크스페이스 멤버를 검색하지 못했습니다.')
    }
  },
}
