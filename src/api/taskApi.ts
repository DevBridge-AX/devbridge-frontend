import axiosClient from './axiosClient'

export interface Task {
  id: string
  workspaceId: string
  requesterId: string
  assigneeId: string | null
  title: string
  description: string | null
  status: string
  dueDate: string | null
}

export const taskApi = {
  fetchTasksByWorkspace(workspaceId: string): Promise<Task[]> {
    return axiosClient
      .get<Task[]>('/api/tasks', {
        params: { workspaceId },
      })
      .then((res) => res.data)
  },
}
