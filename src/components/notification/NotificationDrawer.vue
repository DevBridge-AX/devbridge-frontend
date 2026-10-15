<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/state/authStore'
import { useWorkspaceStore } from '@/state/workspaceStore'
import { useNotificationStore } from '@/state/notificationStore'
import type { Notification, NotificationType } from '@/state/notificationStore'
import { useConfirm } from '@/composables/useConfirm'
import { notificationService } from '@/services/notificationService'
import type { NotificationResponse } from '@/api/notificationApi'
import { ownerConfirmationService } from '@/services/ownerConfirmationService'
import type { OwnerConfirmationResponse } from '@/api/ownerConfirmationApi'
import type { NotificationDrawerTab } from '@/types/notification'
import NotificationDrawerTabs from '@/components/notification/NotificationDrawerTabs.vue'
import NotificationDrawerList from '@/components/notification/NotificationDrawerList.vue'
import NotificationDrawerRequestList from '@/components/notification/NotificationDrawerRequestList.vue'
import '@/assets/styles/notification-drawer.css'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const { confirm } = useConfirm()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const notificationStore = useNotificationStore()

const activeTab = ref<NotificationDrawerTab>('all')
const items = ref<Notification[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const currentPage = ref(0)
const totalElements = ref(0)
const PAGE_SIZE = 20

const hasMore = computed(() => items.value.length < totalElements.value)

const requestItems = ref<OwnerConfirmationResponse[]>([])
const requestLoading = ref(false)
const requestLoadingMore = ref(false)
const requestPage = ref(0)
const requestTotal = ref(0)

const hasMoreRequests = computed(() => requestItems.value.length < requestTotal.value)

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
    const res = await notificationService.getNotifications(
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

async function loadRequestPage(page: number, append: boolean) {
  try {
    const res = await ownerConfirmationService.getRequestedList({ page, size: PAGE_SIZE })
    if (append) {
      requestItems.value.push(...res.content)
    } else {
      requestItems.value = res.content
    }
    requestTotal.value = res.totalElements
    requestPage.value = res.number
  } catch {
    // 로드 실패 시 현재 목록 유지
  }
}

async function fetchRequestsInitial() {
  requestLoading.value = true
  await loadRequestPage(0, false)
  requestLoading.value = false
}

async function loadMoreRequests() {
  if (!hasMoreRequests.value || requestLoadingMore.value) return
  requestLoadingMore.value = true
  await loadRequestPage(requestPage.value + 1, true)
  requestLoadingMore.value = false
}

function handleRequestItemClick(item: OwnerConfirmationResponse) {
  notificationService.openAnswerModal(item.id, true)
  emit('close')
}

function buildRoute(type: NotificationType, workspaceId: string, referenceId: string): string | null {
  const base = `/workspaces/${workspaceId}/schedule`

  switch (type) {
    case 'MEETING_INVITED':
      return `${base}?scheduleId=${referenceId}&action=respond`
    case 'MEETING_UPDATED':
    case 'MEETING_CONFIRMED':
    case 'MEETING_REOPENED':
    case 'MEETING_REMINDER':
      return `${base}?scheduleId=${referenceId}`
    case 'MEETING_CANCELED':
      return base
    default:
      return null
  }
}

async function handleItemClick(item: Notification) {
  if (!item.isRead) {
    try {
      await notificationService.markAsRead(item.id)
      const target = items.value.find((n) => n.id === item.id)
      if (target) {
        target.isRead = true
      }
    } catch {
      // 읽음 처리 실패 시 무시
    }
  }

  if (
    item.notificationType === 'OWNER_CONFIRMATION' ||
    item.notificationType === 'OWNER_ANSWER_RECEIVED'
  ) {
    const readOnly = item.notificationType === 'OWNER_ANSWER_RECEIVED'
    notificationService.openAnswerModal(item.referenceId, readOnly)
    emit('close')
    return
  }

  if (!item.workspaceId) return

  if (item.workspaceId !== workspaceStore.currentWorkspaceId) {
    const confirmed = await confirm({
      title: '워크스페이스 전환',
      message: '다른 워크스페이스의 알림입니다. 해당 워크스페이스로 전환하시겠습니까?',
      confirmText: '확인',
    })
    if (!confirmed) return
  }

  const path = buildRoute(item.notificationType, item.workspaceId, item.referenceId)
  if (!path) return

  emit('close')
  router.push(path)
}

function switchTab(tab: NotificationDrawerTab) {
  if (activeTab.value === tab) return
  activeTab.value = tab
  if (tab === 'requests') {
    void fetchRequestsInitial()
  } else {
    void fetchInitial()
  }
}

function handleOverlayClick() {
  emit('close')
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
    <Transition name="notification-drawer-overlay">
      <div
        v-if="props.open"
        class="notification-drawer-overlay"
        @click="handleOverlayClick"
      ></div>
    </Transition>

    <Transition name="notification-drawer-slide">
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
        <NotificationDrawerTabs :active-tab="activeTab" :unread-count="notificationStore.unreadCount" @change="switchTab" />

        <!-- Content: Notifications (all / unread) -->
        <NotificationDrawerList v-if="activeTab !== 'requests'" :items="items" :is-loading="isLoading" :is-loading-more="isLoadingMore" :has-more="hasMore" @select="handleItemClick" @load-more="loadMore" />

        <!-- Content: My Requests -->
        <NotificationDrawerRequestList v-else :items="requestItems" :is-loading="requestLoading" :is-loading-more="requestLoadingMore" :has-more="hasMoreRequests" @select="handleRequestItemClick" @load-more="loadMoreRequests" />
      </aside>
    </Transition>
  </Teleport>
</template>
