import axios from 'axios'
import { dataSourceApi } from '@/api/dataSourceApi'
import type { ConnectDataSourceRequest, DataSourceItem } from '@/api/dataSourceApi'

// Local in-memory store for mock mode
const mockDataSources = new Map<string, DataSourceItem[]>()

function getMockSources(workspaceId: string): DataSourceItem[] {
  if (!mockDataSources.has(workspaceId)) {
    mockDataSources.set(workspaceId, [
      {
        id: 'mock-ds-1',
        workspaceId,
        sourceType: 'DOC',
        sourceName: '결제 모듈 개발 가이드문서.docx',
        status: 'indexed',
      },
      {
        id: 'mock-ds-2',
        workspaceId,
        sourceType: 'GIT',
        sourceName: 'https://github.com/DevBridge-AX/devbridge-frontend.git',
        status: 'indexed',
      },
    ])
  }
  return mockDataSources.get(workspaceId) || []
}

async function connectDataSource(
  request: ConnectDataSourceRequest,
): Promise<DataSourceItem> {
  const isMock = import.meta.env.VITE_WS_MOCK === 'true'

  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    const list = getMockSources(request.workspaceId)
    const newDS: DataSourceItem = {
      id: `mock-ds-${Date.now()}`,
      workspaceId: request.workspaceId,
      sourceType: request.sourceType,
      sourceName: request.sourceName,
      status: 'pending',
    }
    list.push(newDS)

    // Simulate status transition: pending -> indexed (after 4 seconds)
    setTimeout(() => {
      newDS.status = 'indexed'
    }, 4000)

    return newDS
  }

  try {
    return await dataSourceApi.connectDataSource(request)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const msg = error.response?.data?.message
      throw new Error(msg || '데이터 소스 연동에 실패했습니다.')
    }
    throw new Error('데이터 소스 연동에 실패했습니다.')
  }
}

async function deleteDataSource(
  dataSourceId: string,
  workspaceId: string,
): Promise<void> {
  const isMock = import.meta.env.VITE_WS_MOCK === 'true'

  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    const list = mockDataSources.get(workspaceId)
    if (list) {
      const filtered = list.filter((s) => s.id !== dataSourceId)
      mockDataSources.set(workspaceId, filtered)
    }
    return
  }

  try {
    await dataSourceApi.deleteDataSource(dataSourceId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('데이터 소스 삭제 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('삭제할 데이터 소스를 찾을 수 없습니다.')
      }
    }

    throw new Error('데이터 소스 삭제에 실패했습니다.')
  }
}

async function fetchDataSources(workspaceId: string): Promise<DataSourceItem[]> {
  const isMock = import.meta.env.VITE_WS_MOCK === 'true'

  if (isMock) {
    return getMockSources(workspaceId)
  }

  try {
    return await dataSourceApi.fetchDataSources(workspaceId)
  } catch (error: unknown) {
    console.warn('Backend DataSource API failed, falling back to mock data.', error)
    return getMockSources(workspaceId)
  }
}

export const dataSourceService = {
  connectDataSource,
  deleteDataSource,
  fetchDataSources,
}
