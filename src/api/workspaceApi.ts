import axiosClient from '@/api/axiosClient'

export type WorkspacePermission = 'OWNER' | 'MEMBER' | 'GUEST'

export interface Workspace {
  id: string
  name: string
  description: string | null
  myPermission: WorkspacePermission | null
}

export interface CreateWorkspacePayload {
  name: string
  description?: string | null
}

export interface InviteMemberPayload {
  email: string
  role: WorkspacePermission
}

export interface WorkspaceInvitation {
  invitationId: string
  workspaceId: string
  workspaceName: string
  invitedEmail: string
  assignedPermission: WorkspacePermission
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | string
}

export interface CurrentUserResponse {
  id: string
  employeeId: string
  email: string
  name: string
  department: string | null
  position: string | null
  jobRole: string | null
  systemRole: string | null
}

export interface WorkspaceMemberResponse {
  userId: string
  employeeId: string
  name: string
  department: string | null
  position: string | null
  permission?: WorkspacePermission
}

export const fetchCurrentUser = async (): Promise<CurrentUserResponse> => {
  const response = await axiosClient.get<CurrentUserResponse>('/api/users/me')
  return response.data
}

export const fetchMyWorkspaces = async (): Promise<Workspace[]> => {
  const response = await axiosClient.get<Workspace[]>('/api/workspaces')
  return response.data
}

export const createWorkspace = async (
  payload: CreateWorkspacePayload,
): Promise<Workspace> => {
  const response = await axiosClient.post<Workspace>('/api/workspaces', payload)
  return response.data
}

export const inviteMember = async (
  workspaceId: string,
  payload: InviteMemberPayload,
): Promise<void> => {
  await axiosClient.post<void>('/api/workspaces/invite', payload, {
    headers: {
      'X-Workspace-Id': workspaceId,
    },
  })
}

export const fetchReceivedInvitations = async (): Promise<
  WorkspaceInvitation[]
> => {
  const response = await axiosClient.get<WorkspaceInvitation[]>(
    '/api/workspaces/invitations/received',
  )
  return response.data
}

export const acceptInvitation = async (invitationId: string): Promise<void> => {
  await axiosClient.post<void>(
    `/api/workspaces/invitations/${invitationId}/accept`,
  )
}

export const updateWorkspaceAccess = async (
  workspaceId: string,
): Promise<void> => {
  await axiosClient.patch<void>(`/api/workspaces/${workspaceId}/access`)
}

export const searchMembers = async (
  workspaceId: string,
  keyword: string,
): Promise<WorkspaceMemberResponse[]> => {
  const response = await axiosClient.get<WorkspaceMemberResponse[]>(
    '/api/workspaces/members',
    {
      params: {
        keyword,
      },
      headers: {
        'X-Workspace-Id': workspaceId,
      },
    },
  )

  return response.data
}
