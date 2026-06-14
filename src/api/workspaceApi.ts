import axiosClient from './axiosClient'

export interface Workspace {
  id: string
  name: string
  description: string | null
}

export const workspaceApi = {
  fetchMyWorkspaces(): Promise<Workspace[]> {
    return axiosClient
      .get<Workspace[]>('/api/workspaces')
      .then((res) => res.data)
  },

  updateWorkspaceAccess(workspaceId: string): Promise<void> {
    return axiosClient
      .patch<void>(`/api/workspaces/${workspaceId}/access`)
      .then(() => undefined)
  },
}
