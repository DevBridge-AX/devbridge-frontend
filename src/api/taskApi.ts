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

export interface CreateTaskRequest {
  workspaceId: string
  requesterId: string
  assigneeId: string | null
  title: string
  description: string | null
  dueDate: string | null
}

export interface UpdateTaskRequest {
  assigneeId: string | null
  title: string
  description: string | null
  dueDate: string | null
}

export interface UpdateTaskStatusRequest {
  status: string
  changedBy: string | null
}

export interface RelatedDocumentPreview {
  id: string
  title: string
  summary: string | null
  analysisStatus: string | null
  uploadedAt: string | null
}

export interface RelatedCommitPreview {
  id: string
  commitHash: string
  message: string
  authorName: string | null
  summary: string | null
  committedAt: string | null
}

export interface DeliverablePreview {
  id: string
  title: string
  fileUrl: string | null
  submittedByName: string | null
  submittedAt: string | null
}

export interface ActivityPreview {
  id: string
  type: string
  message: string
  actorName: string | null
  createdAt: string | null
}

export interface TaskDetail {
  id: string

  workspaceId: string
  workspaceName: string

  requesterId: string
  requesterName: string
  requesterDepartment: string | null

  assigneeId: string | null
  assigneeName: string | null
  assigneeDepartment: string | null

  title: string
  description: string | null
  status: string
  priority: string | null
  dueDate: string | null

  createdAt: string | null
  updatedAt: string | null

  aiSummary: string | null
  progressSummary: string | null
  nextAction: string | null
  riskLevel: string | null

  documentCount: number
  commitCount: number
  deliverableCount: number
  activityCount: number

  recentDocuments: RelatedDocumentPreview[]
  recentCommits: RelatedCommitPreview[]
  recentDeliverables: DeliverablePreview[]
  recentActivities: ActivityPreview[]
}

export const taskApi = {
  fetchTasksByWorkspace(workspaceId: string): Promise<Task[]> {
    return axiosClient
      .get<Task[]>('/api/tasks', {
        params: { workspaceId },
      })
      .then((res) => res.data)
  },

  fetchTaskDetail(taskId: string): Promise<TaskDetail> {
    return axiosClient
      .get<TaskDetail>(`/api/tasks/${taskId}`)
      .then((res) => res.data)
  },

  createTask(request: CreateTaskRequest): Promise<Task> {
    return axiosClient.post<Task>('/api/tasks', request).then((res) => res.data)
  },

  updateTask(taskId: string, request: UpdateTaskRequest): Promise<Task> {
    return axiosClient
      .put<Task>(`/api/tasks/${taskId}`, request)
      .then((res) => res.data)
  },

  updateTaskStatus(
    taskId: string,
    request: UpdateTaskStatusRequest,
  ): Promise<void> {
    return axiosClient
      .put<void>(`/api/tasks/${taskId}/status`, request)
      .then((res) => res.data)
  },

  deleteTask(taskId: string): Promise<void> {
    return axiosClient
      .delete<void>(`/api/tasks/${taskId}`)
      .then((res) => res.data)
  },
}
