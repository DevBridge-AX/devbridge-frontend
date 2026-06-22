import axiosClient from './axiosClient'
import type { NotificationType } from '@/state/notificationStore'

// ─── Request / Response 타입 정의 (Co-location) ───────────────────────────

export interface NotificationResponse {
  notificationId: string
  notificationType: NotificationType
  referenceId: string
  workspaceId: string | null
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface NotificationPageResponse {
  content: NotificationResponse[]
  totalElements: number
  number: number
  size: number
}

export interface GetNotificationsParams {
  isRead?: boolean
  page?: number
  size?: number
}

// ─── API 객체 (Layer 1: Axios 통신 규격만 정의) ────────────────────────────

export const notificationApi = {
  getNotifications(
    employeeId: string,
    params: GetNotificationsParams,
  ): Promise<NotificationPageResponse> {
    return axiosClient
      .get<NotificationPageResponse>(
        `/api/notifications/users/${encodeURIComponent(employeeId)}`,
        { params },
      )
      .then((res) => res.data)
  },

  markAsRead(notificationId: string): Promise<void> {
    return axiosClient
      .put<void>(`/api/notifications/${encodeURIComponent(notificationId)}/read`)
      .then(() => undefined)
  },
}
