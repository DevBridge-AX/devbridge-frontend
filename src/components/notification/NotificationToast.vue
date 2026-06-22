<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { NotificationPayload } from '@/state/notificationStore'

interface ToastItem {
  id: string
  notificationType: string
  title: string
  message: string
}

const toasts = ref<ToastItem[]>([])
const timerMap = new Map<string, ReturnType<typeof setTimeout>>()

const ICON_MAP: Record<string, string> = {
  MEETING_INVITED: '📅',
  MEETING_UPDATED: '🔄',
  MEETING_CANCELLED: '❌',
  QUESTION_ASSIGNED: '❓',
}

const LABEL_MAP: Record<string, string> = {
  MEETING_INVITED: '회의 초대',
  MEETING_UPDATED: '회의 변경',
  MEETING_CANCELLED: '회의 취소',
  QUESTION_ASSIGNED: '질문 배정',
}

function handleNotification(e: Event) {
  const customEvent = e as CustomEvent<NotificationPayload>
  if (!customEvent.detail) return

  const payload = customEvent.detail
  const toast: ToastItem = {
    id: payload.notification_id,
    notificationType: payload.notification_type,
    title: payload.title,
    message: payload.message,
  }

  toasts.value.push(toast)

  const timer = setTimeout(() => {
    removeToast(toast.id)
  }, 3000)
  timerMap.set(toast.id, timer)
}

function removeToast(id: string) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
  const timer = timerMap.get(id)
  if (timer) {
    clearTimeout(timer)
    timerMap.delete(id)
  }
}

function closeToast(e: Event, id: string) {
  e.stopPropagation()
  removeToast(id)
}

function getIcon(type: string): string {
  return ICON_MAP[type] ?? '🔔'
}

function getLabel(type: string): string {
  return LABEL_MAP[type] ?? '알림'
}

function getAccentClass(type: string): string {
  if (type === 'MEETING_CANCELLED') return 'accent-danger'
  if (type === 'QUESTION_ASSIGNED') return 'accent-question'
  return 'accent-meeting'
}

onMounted(() => {
  window.addEventListener('notification-received', handleNotification)
})

onUnmounted(() => {
  window.removeEventListener('notification-received', handleNotification)
  timerMap.forEach(clearTimeout)
  timerMap.clear()
})
</script>

<template>
  <div class="notification-toast-container">
    <TransitionGroup name="notification-toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="notification-toast"
        :class="getAccentClass(toast.notificationType)"
        role="alert"
        @click="removeToast(toast.id)"
      >
        <div class="notification-toast-header">
          <span class="notification-toast-badge">
            <span class="notification-toast-icon">{{ getIcon(toast.notificationType) }}</span>
            {{ getLabel(toast.notificationType) }}
          </span>
          <button
            type="button"
            class="notification-toast-close"
            aria-label="닫기"
            @click="closeToast($event, toast.id)"
          >
            &times;
          </button>
        </div>
        <div class="notification-toast-title">{{ toast.title }}</div>
        <div class="notification-toast-message">{{ toast.message }}</div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.notification-toast-container {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 2100;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  max-width: 360px;
}

.notification-toast {
  pointer-events: auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 4px solid #3b82f6;
}

.notification-toast:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.16);
}

.notification-toast.accent-meeting {
  border-left-color: #3b82f6;
}

.notification-toast.accent-danger {
  border-left-color: #ef4444;
}

.notification-toast.accent-question {
  border-left-color: #f59e0b;
}

.notification-toast-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.notification-toast-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.notification-toast-icon {
  font-size: 14px;
}

.notification-toast-close {
  background: transparent;
  border: 0;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.notification-toast-close:hover {
  background: #f1f5f9;
  color: #475569;
}

.notification-toast-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-toast-message {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Transition ───────────────────────────────────────────────── */
.notification-toast-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.notification-toast-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.notification-toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.notification-toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}

.notification-toast-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Dark Theme ───────────────────────────────────────────────── */
:global(.dark-theme) .notification-toast {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

:global(.dark-theme) .notification-toast:hover {
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
}

:global(.dark-theme) .notification-toast-title {
  color: #f1f5f9;
}

:global(.dark-theme) .notification-toast-message {
  color: #94a3b8;
}

:global(.dark-theme) .notification-toast-badge {
  color: #94a3b8;
}

:global(.dark-theme) .notification-toast-close {
  color: #64748b;
}

:global(.dark-theme) .notification-toast-close:hover {
  background: #334155;
  color: #e2e8f0;
}
</style>
