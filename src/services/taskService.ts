import axios from 'axios'
import { taskApi } from '@/api/taskApi'
import type { Task } from '@/api/taskApi'

async function getTasksByWorkspace(workspaceId: string): Promise<Task[]> {
  if (!workspaceId) {
    throw new Error('워크스페이스 정보가 없습니다.')
  }

  try {
    return await taskApi.fetchTasksByWorkspace(workspaceId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('업무 목록을 조회할 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('해당 워크스페이스의 업무 목록을 찾을 수 없습니다.')
      }
    }

    throw new Error('업무 목록을 불러오지 못했습니다.')
  }
}

export const taskService = {
  getTasksByWorkspace,
}
