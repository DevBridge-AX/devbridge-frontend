<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/state/authStore'
import { useNotificationStore } from '@/state/notificationStore'
import type { Notification, NotificationType } from '@/state/notificationStore'
import { notificationApi } from '@/api/notificationApi'
import type { NotificationResponse } from '@/api/notificationApi'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

type TabKey = 'all' | 'unread'
const activeTab = ref<TabKey>('all')
const items = ref<Notification[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const currentPage = ref(0)
const totalElements = ref(0)
const PAGE_SIZE = 20

const hasMore = computed(() => items.value.length < totalElements.value)

const ICON_MAP: Record<string, string> = {
  MEETING_INVITED: '📅',
  MEETING_UPDATED: '🔄',
  MEETING_CANCELLED: '❌',
  QUESTION_ASSIGNED: '❓',
}

function mapResponse(r: NotificationResponse): Notification {
  return {
    id: r.notificationId,
    notificationType: r.notificationType,
    referenceId: r.referenceId,
    workspaceId: r.workspaceId,
    title: r.title,
    message: r.message,
    createdAt: r.createdAt,
    isRead: r.isRead,
  }
}

async function loadPage(page: number, append: boolean) {
  const employeeId = authStore.currentUser?.employeeId
  if (!employeeId) return

  const params: Record<string, unknown> = { page, size: PAGE_SIZE }
  if (activeTab.value === 'unread') {
    params.isRead = false
  }

  try {
    const res = await notificationApi.getNotifications(
      employeeId,
      params as { page: number; size: number; isRead?: boolean },
    )
    const mapped = res.content.map(mapResponse)

    if (append) {
      items.value.push(...mapped)
    } else {
      items.value = mapped
    }
    totalElements.value = res.totalElements
    currentPage.value = res.number
  } catch {
    // 로드 실패 시 현재 목록 유지
  }
}

async function fetchInitial() {
  isLoading.value = true
  await loadPage(0, false)
  isLoading.value = false
}

async function loadMore() {
  if (!hasMore.value || isLoadingMore.value) return
  isLoadingMore.value = true
  await loadPage(currentPage.value + 1, true)
  isLoadingMore.value = false
}

function buildRoute(type: NotificationType, workspaceId: string, referenceId: string): string | null {
  const base = `/workspaces/${workspaceId}/schedule`

  switch (type) {
    case 'MEETING_INVITED':
      return `${base}?scheduleId=${referenceId}&action=respond`
    case 'MEETING_UPDATED':
      return `${base}?scheduleId=${referenceId}`
    case 'MEETING_CANCELLED':
      return base
    case 'QUESTION_ASSIGNED':
      return `/workspaces/${workspaceId}/chat`
    default:
      return null
  }
}

async function handleItemClick(item: Notification) {
  if (!item.isRead) {
    try {
      await notificationApi.markAsRead(item.id)
      notificationStore.markAsRead(item.id)
      const target = items.value.find((n) => n.id === item.id)
      if (target) {
        target.isRead = true
      }
    } catch {
      // 읽음 처리 실패 시 무시
    }
  }

  if (!item.workspaceId) return

  const path = buildRoute(item.notificationType, item.workspaceId, item.referenceId)
  if (!path) return

  emit('close')
  router.push(path)
}

function switchTab(tab: TabKey) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  void fetchInitial()
}

function handleOverlayClick() {
  emit('close')
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const target = new Date(dateString).getTime()
  const diff = now - target
  if (diff < 0) return '방금 전'

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '방금 전'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}개월 전`

  return `${Math.floor(months / 12)}년 전`
}

watch(
  () => props.open,
  (opened) => {
    if (opened) {
      activeTab.value = 'all'
      void fetchInitial()
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-overlay">
      <div
        v-if="props.open"
        class="notification-drawer-overlay"
        @click="handleOverlayClick"
      ></div>
    </Transition>

    <Transition name="drawer-slide">
      <aside
        v-if="props.open"
        class="notification-drawer"
        @click.stop
      >
        <!-- Header -->
        <div class="drawer-header">
          <h2 class="drawer-title">알림</h2>
          <button
            type="button"
            class="drawer-close-btn"
            aria-label="닫기"
            @click="emit('close')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="drawer-tabs">
          <button
            type="button"
            class="drawer-tab"
            :class="{ active: activeTab === 'all' }"
            @click="switchTab('all')"
          >전체</button>
          <button
            type="button"
            class="drawer-tab"
            :class="{ active: activeTab === 'unread' }"
            @click="switchTab('unread')"
          >
            안읽음
            <span v-if="notificationStore.unreadCount > 0" class="tab-count">
              {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
            </span>
          </button>
        </div>

        <!-- Content -->
        <div class="drawer-content">
          <!-- Loading -->
          <div v-if="isLoading" class="drawer-empty">
            <div class="drawer-spinner"></div>
            <span>알림을 불러오는 중...</span>
          </div>

          <!-- Empty -->
          <div v-else-if="items.length === 0" class="drawer-empty">
            <div class="drawer-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <span class="drawer-empty-text">알림이 없습니다</span>
          </div>

          <!-- List -->
          <template v-else>
            <div
              v-for="item in items"
              :key="item.id"
              class="notification-item"
              :class="{ unread: !item.isRead }"
              @click="handleItemClick(item)"
            >
              <div class="notification-item-icon">
                {{ ICON_MAP[item.notificationType] ?? '🔔' }}
              </div>
              <div class="notification-item-body">
                <div class="notification-item-title">{{ item.title }}</div>
                <div class="notification-item-message">{{ item.message }}</div>
                <div class="notification-item-time">{{ formatRelativeTime(item.createdAt) }}</div>
              </div>
              <div v-if="!item.isRead" class="notification-item-dot"></div>
            </div>

            <!-- Load More -->
            <button
              v-if="hasMore"
              type="button"
              class="drawer-load-more"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              {{ isLoadingMore ? '불러오는 중...' : '더 보기' }}
            </button>
          </template>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ──────────────────────────────────────────────────── */
.notification-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(2px);
  z-index: 200;
}

/* ── Drawer Panel ─────────────────────────────────────────────── */
.notification-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  max-width: 100vw;
  height: 100vh;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  box-shadow: -8px 0 32px rgba(15, 23, 42, 0.1);
  z-index: 210;
  display: flex;
  flex-direction: column;
}

/* ── Header ───────────────────────────────────────────────────── */
.drawer-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.drawer-title {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.drawer-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.15s ease;
}

.drawer-close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

/* ── Tabs ─────────────────────────────────────────────────────── */
.drawer-tabs {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  padding: 12px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.drawer-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.drawer-tab:hover {
  background: #f8fafc;
  color: #334155;
}

.drawer-tab.active {
  background: #1e293b;
  color: #ffffff;
  border-color: #1e293b;
}

.tab-count {
  font-size: 11px;
  font-weight: 800;
  background: #ef4444;
  color: #ffffff;
  padding: 0 5px;
  border-radius: 999px;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
}

.drawer-tab.active .tab-count {
  background: #ffffff;
  color: #1e293b;
}

/* ── Content ──────────────────────────────────────────────────── */
.drawer-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.drawer-content::-webkit-scrollbar {
  width: 5px;
}

.drawer-content::-webkit-scrollbar-track {
  background: transparent;
}

.drawer-content::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.drawer-content::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

/* ── Empty / Loading ──────────────────────────────────────────── */
.drawer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 20px;
  color: #94a3b8;
  font-size: 14px;
}

.drawer-empty-icon {
  width: 56px;
  height: 56px;
  background: #f1f5f9;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #94a3b8;
  margin-bottom: 4px;
}

.drawer-empty-text {
  font-weight: 600;
}

.drawer-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: drawer-spin 0.6s linear infinite;
}

@keyframes drawer-spin {
  to { transform: rotate(360deg); }
}

/* ── Notification Item ────────────────────────────────────────── */
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #f1f5f9;
}

.notification-item:hover {
  background: #f8fafc;
}

.notification-item.unread {
  background: #eff6ff;
}

.notification-item.unread:hover {
  background: #dbeafe;
}

.notification-item-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  background: #f1f5f9;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 16px;
}

.notification-item.unread .notification-item-icon {
  background: #dbeafe;
}

.notification-item-body {
  flex: 1;
  min-width: 0;
}

.notification-item-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-item-message {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-item-time {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

.notification-item-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  margin-top: 4px;
}

/* ── Load More ────────────────────────────────────────────────── */
.drawer-load-more {
  display: block;
  width: 100%;
  padding: 14px;
  border: none;
  background: transparent;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.drawer-load-more:hover:not(:disabled) {
  background: #f8fafc;
  color: #2563eb;
}

.drawer-load-more:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

/* ── Transitions ──────────────────────────────────────────────── */
.drawer-overlay-enter-active,
.drawer-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-overlay-enter-from,
.drawer-overlay-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-slide-leave-active {
  transition: transform 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

/* ── Dark Theme ───────────────────────────────────────────────── */
:global(.dark-theme) .notification-drawer-overlay {
  background: rgba(0, 0, 0, 0.4);
}

:global(.dark-theme) .notification-drawer {
  background: #0f172a;
  border-left-color: #1e293b;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.35);
}

:global(.dark-theme) .drawer-header {
  border-bottom-color: #1e293b;
}

:global(.dark-theme) .drawer-title {
  color: #f1f5f9;
}

:global(.dark-theme) .drawer-close-btn {
  color: #94a3b8;
}

:global(.dark-theme) .drawer-close-btn:hover {
  background: #1e293b;
  color: #f1f5f9;
}

:global(.dark-theme) .drawer-tabs {
  border-bottom-color: #1e293b;
}

:global(.dark-theme) .drawer-tab {
  border-color: #334155;
  color: #94a3b8;
}

:global(.dark-theme) .drawer-tab:hover {
  background: #1e293b;
  color: #e2e8f0;
}

:global(.dark-theme) .drawer-tab.active {
  background: #e2e8f0;
  color: #0f172a;
  border-color: #e2e8f0;
}

:global(.dark-theme) .drawer-tab.active .tab-count {
  background: #0f172a;
  color: #e2e8f0;
}

:global(.dark-theme) .drawer-empty-icon {
  background: #1e293b;
  color: #64748b;
}

:global(.dark-theme) .notification-item {
  border-bottom-color: #1e293b;
}

:global(.dark-theme) .notification-item:hover {
  background: #1e293b;
}

:global(.dark-theme) .notification-item.unread {
  background: #172554;
}

:global(.dark-theme) .notification-item.unread:hover {
  background: #1e3a5f;
}

:global(.dark-theme) .notification-item-icon {
  background: #1e293b;
}

:global(.dark-theme) .notification-item.unread .notification-item-icon {
  background: #1e3a8a;
}

:global(.dark-theme) .notification-item-title {
  color: #f1f5f9;
}

:global(.dark-theme) .notification-item-message {
  color: #94a3b8;
}

:global(.dark-theme) .notification-item-time {
  color: #64748b;
}

:global(.dark-theme) .drawer-load-more {
  color: #60a5fa;
}

:global(.dark-theme) .drawer-load-more:hover:not(:disabled) {
  background: #1e293b;
}
</style>
