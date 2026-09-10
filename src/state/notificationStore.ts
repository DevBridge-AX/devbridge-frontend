import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type NotificationType =
  | 'MEETING_INVITED'
  | 'MEETING_UPDATED'
  | 'MEETING_CANCELED'
  | 'MEETING_CONFIRMED'
  | 'MEETING_REOPENED'
  | 'MEETING_REMINDER'
  | 'OWNER_CONFIRMATION'
  | 'OWNER_ANSWER_RECEIVED'

export interface Notification {
  id: string
  notificationType: NotificationType
  referenceId: string
  workspaceId: string | null
  title: string
  message: string
  createdAt: string
  isRead: boolean
}

export interface NotificationPayload {
  notification_id: string
  notification_type: NotificationType
  reference_id: string
  workspace_id?: string
  title: string
  message: string
  created_at: string
}

// ─── Layer 2: Notification State (Pinia) ─────────────────────────────────────
// 순수 메모리 상태만 관리합니다. api 직접 호출 금지.

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const pendingAnswerConfirmationId = ref<string | null>(null)
  const pendingAnswerReadOnly = ref(false)

  const hasUnread = computed(() => unreadCount.value > 0)

  function addNotification(payload: NotificationPayload): void {
    const notification: Notification = {
      id: payload.notification_id,
      notificationType: payload.notification_type,
      referenceId: payload.reference_id,
      workspaceId: payload.workspace_id ?? null,
      title: payload.title,
      message: payload.message,
      createdAt: payload.created_at,
      isRead: false,
    }
    notifications.value.unshift(notification)
    unreadCount.value++
  }

  function setNotifications(items: Notification[], totalUnread: number): void {
    notifications.value = items
    unreadCount.value = totalUnread
  }

  function markAsRead(notificationId: string): void {
    const target = notifications.value.find((n) => n.id === notificationId)
    if (target && !target.isRead) {
      target.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  function openAnswerModal(confirmationId: string, readOnly: boolean): void {
    pendingAnswerConfirmationId.value = confirmationId
    pendingAnswerReadOnly.value = readOnly
  }

  function closeAnswerModal(): void {
    pendingAnswerConfirmationId.value = null
    pendingAnswerReadOnly.value = false
  }

  return {
    notifications,
    unreadCount,
    pendingAnswerConfirmationId,
    pendingAnswerReadOnly,
    hasUnread,
    addNotification,
    setNotifications,
    markAsRead,
    openAnswerModal,
    closeAnswerModal,
  }
})
