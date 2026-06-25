import { dashboardApi } from '@/api/dashboardApi'
import type {
  WorkspaceDashboardSummary,
  WorkspaceDashboardDetail,
} from '@/api/dashboardApi'
import axios from 'axios'

export interface DashboardData {
  summary: WorkspaceDashboardSummary
  detail: WorkspaceDashboardDetail
}

async function getDashboardSummary(
  workspaceId: string,
): Promise<WorkspaceDashboardSummary> {
  try {
    return await dashboardApi.fetchSummary(workspaceId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 400) {
        throw new Error('워크스페이스 ID가 올바르지 않습니다.')
      }

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 404) {
        throw new Error('워크스페이스 대시보드 정보를 찾을 수 없습니다.')
      }
    }

    throw new Error('대시보드 요약 정보를 불러오지 못했습니다.')
  }
}

async function getDashboardDetail(
  workspaceId: string,
): Promise<WorkspaceDashboardDetail> {
  try {
    return await dashboardApi.fetchDetail(workspaceId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 400) {
        throw new Error('워크스페이스 ID가 올바르지 않습니다.')
      }

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 404) {
        throw new Error('워크스페이스 상세 정보를 찾을 수 없습니다.')
      }
    }

    throw new Error('대시보드 상세 정보를 불러오지 못했습니다.')
  }
}

async function getDashboardData(workspaceId: string): Promise<DashboardData> {
  const [summary, detail] = await Promise.all([
    getDashboardSummary(workspaceId),
    getDashboardDetail(workspaceId),
  ])

  return {
    summary,
    detail,
  }
}

async function getDashboardAiSummary(
  workspaceId: string,
): Promise<string> {
  try {
    const response = await dashboardApi.fetchAiSummary(workspaceId)
    return response.summary
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status === 400) throw new Error('워크스페이스 ID가 올바르지 않습니다.')
      if (status === 500) throw new Error('AI 엔진 연결에 실패했습니다.')
    }
    throw new Error('AI 요약을 불러오지 못했습니다.')
  }
}

export const dashboardService = {
  getDashboardSummary,
  getDashboardDetail,
  getDashboardData,
  getDashboardAiSummary,
}
