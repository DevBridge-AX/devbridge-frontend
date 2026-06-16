import axios from 'axios'
import { taskApi } from '@/api/taskApi'
import type {
  CreateTaskRequest,
  Task,
  TaskDetail,
  UpdateTaskRequest,
  UpdateTaskStatusRequest,
} from '@/api/taskApi'

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

async function getTaskDetail(taskId: string): Promise<TaskDetail> {
  if (!taskId) {
    throw new Error('업무 정보가 없습니다.')
  }

  try {
    return await taskApi.fetchTaskDetail(taskId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('업무 상세 정보를 조회할 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('해당 업무를 찾을 수 없습니다.')
      }
    }

    throw new Error('업무 상세 정보를 불러오지 못했습니다.')
  }
}

async function createTask(request: CreateTaskRequest): Promise<Task> {
  if (!request.workspaceId) {
    throw new Error('워크스페이스 정보가 없습니다.')
  }

  if (!request.requesterId) {
    throw new Error('요청자 정보가 없습니다.')
  }

  if (!request.title.trim()) {
    throw new Error('업무 제목을 입력해야 합니다.')
  }

  try {
    return await taskApi.createTask(request)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('업무를 생성할 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error(
          '업무 생성에 필요한 워크스페이스 또는 사용자를 찾을 수 없습니다.',
        )
      }
    }

    throw new Error('업무를 생성하지 못했습니다.')
  }
}

async function updateTask(
  taskId: string,
  request: UpdateTaskRequest,
): Promise<Task> {
  if (!taskId) {
    throw new Error('업무 정보가 없습니다.')
  }

  if (!request.title.trim()) {
    throw new Error('업무 제목을 입력해야 합니다.')
  }

  try {
    return await taskApi.updateTask(taskId, request)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('업무를 수정할 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('수정할 업무를 찾을 수 없습니다.')
      }
    }

    throw new Error('업무를 수정하지 못했습니다.')
  }
}

async function updateTaskStatus(
  taskId: string,
  request: UpdateTaskStatusRequest,
): Promise<void> {
  if (!taskId) {
    throw new Error('업무 정보가 없습니다.')
  }

  if (!request.status) {
    throw new Error('변경할 상태 정보가 없습니다.')
  }

  try {
    await taskApi.updateTaskStatus(taskId, request)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('업무 상태를 변경할 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('상태를 변경할 업무를 찾을 수 없습니다.')
      }
    }

    throw new Error('업무 상태를 변경하지 못했습니다.')
  }
}

async function deleteTask(taskId: string): Promise<void> {
  if (!taskId) {
    throw new Error('업무 정보가 없습니다.')
  }

  try {
    await taskApi.deleteTask(taskId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('업무를 삭제할 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('삭제할 업무를 찾을 수 없습니다.')
      }
    }

    throw new Error('업무를 삭제하지 못했습니다.')
  }
}

export const taskService = {
  getTasksByWorkspace,
  getTaskDetail,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
}
