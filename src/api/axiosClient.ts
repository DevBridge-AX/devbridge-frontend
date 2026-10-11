import axios from 'axios'
import { WORKSPACE_ID_KEY } from '@/api/storageKeys'
import { SESSION_EXPIRED_EVENT, toApiError } from '@/api/apiError'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const hasExplicitWorkspaceId =
      config.headers['X-Workspace-Id'] !== undefined &&
      config.headers['X-Workspace-Id'] !== null &&
      config.headers['X-Workspace-Id'] !== ''

    const workspaceId = localStorage.getItem(WORKSPACE_ID_KEY)

    if (!hasExplicitWorkspaceId && workspaceId) {
      config.headers['X-Workspace-Id'] = workspaceId
    }

    return config
  },
  (error: unknown) => Promise.reject(error),
)

axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))

      return Promise.reject(
        toApiError(error, '세션이 만료되었습니다. 다시 로그인해 주세요.'),
      )
    }

    return Promise.reject(error)
  },
)

export default axiosClient
