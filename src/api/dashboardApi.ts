import axiosClient from './axiosClient'

export interface WorkspaceDashboardSummary {
  workspaceId: string
  workspaceName: string
  totalTaskCount: number
  assignedTaskCount: number
  inProgressTaskCount: number
  doneTaskCount: number
  delayedTaskCount: number
  progressRate: number
  memberCount: number
}

export interface DashboardTaskItem {
  taskId: string
  title: string
  status: string
  assigneeName: string
  dueDate: string | null
}

export interface DashboardGitCommitItem {
  commitId: string
  commitHash: string
  commitMessage: string
  authorName: string
  branchName?: string
  pushedAt: string
}

export interface DashboardDocumentItem {
  documentId: string
  title: string
  sourceName: string
  createdAt: string
}

export interface WorkspaceDashboardDetail {
  recentTasks: DashboardTaskItem[]
  delayedTasks: DashboardTaskItem[]
  recentGitCommits: DashboardGitCommitItem[]
  recentDocuments: DashboardDocumentItem[]
}

export interface AiSummaryResponse {
  summary: string
  model: string
  mode: string
}

export const dashboardApi = {
  fetchSummary(workspaceId: string): Promise<WorkspaceDashboardSummary> {
    return axiosClient
      .get<WorkspaceDashboardSummary>('/api/workspace/dashboard/summary', {
        params: { workspaceId },
      })
      .then((res) => res.data)
  },

  fetchDetail(workspaceId: string): Promise<WorkspaceDashboardDetail> {
    return axiosClient
      .get<WorkspaceDashboardDetail>('/api/workspace/dashboard/detail', {
        params: { workspaceId },
      })
      .then((res) => res.data)
  },

  fetchAiSummary(workspaceId: string): Promise<AiSummaryResponse> {
    return axiosClient
      .post<AiSummaryResponse>('/api/workspace/dashboard/ai-summary', null, {
        params: { workspaceId },
      })
      .then((res) => res.data)
  },
}
