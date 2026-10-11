import { notificationApi } from '@/api/notificationApi'
import type {
  GetNotificationsParams,
  NotificationPageResponse,
} from '@/api/notificationApi'
import { toApiError } from '@/api/apiError'
import { useNotificationStore } from '@/state/notificationStore'

// ─── Layer 3: 비즈니스 로직 (Service) ─────────────────────────────────────
// notificationApi와 notificationStore를 조합하여 View/Component가 api·state 세부사항을 신경 쓰지 않도록 추상화합니다.

/** 안 읽은 알림 개수를 서버에서 조회해 store에 반영합니다. */
async function syncUnreadCount(employeeId: string): Promise<void> {
  const notificationStore = useNotificationStore()
  const res = await getNotifications(employeeId, {
    isRead: false,
    page: 0,
    size: 1,
  })
  notificationStore.setNotifications([], res.totalElements)
}

async function getNotifications(
  employeeId: string,
  params: GetNotificationsParams,
): Promise<NotificationPageResponse> {
  try {
    return await notificationApi.getNotifications(employeeId, params)
  } catch (error: unknown) {
    throw toApiError(error, '알림 목록을 불러오지 못했습니다.')
  }
}

async function markAsRead(notificationId: string): Promise<void> {
  try {
    await notificationApi.markAsRead(notificationId)
  } catch (error: unknown) {
    throw toApiError(error, '알림 읽음 처리에 실패했습니다.')
  }

  useNotificationStore().markAsRead(notificationId)
}

function openAnswerModal(confirmationId: string, readOnly: boolean): void {
  useNotificationStore().openAnswerModal(confirmationId, readOnly)
}

export const notificationService = {
  syncUnreadCount,
  getNotifications,
  markAsRead,
  openAnswerModal,
}
