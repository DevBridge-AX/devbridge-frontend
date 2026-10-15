<script setup lang="ts">
import type { Notification } from '@/state/notificationStore'
import { formatRelativeTime } from '@/utils/date'

// ─── Props / Emits ─────────────────────────────────────────────────────────

defineProps<{
  items: Notification[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  select: [item: Notification]
  'load-more': []
}>()

// ─── 알림 타입 → 아이콘 매핑 ────────────────────────────────────────────────

const ICON_MAP: Record<string, string> = {
  MEETING_INVITED: '📅',
  MEETING_UPDATED: '🔄',
  MEETING_CANCELED: '❌',
  MEETING_CONFIRMED: '✅',
  MEETING_REOPENED: '↩️',
  MEETING_REMINDER: '⏰',
  OWNER_CONFIRMATION: '📋',
  OWNER_ANSWER_RECEIVED: '✅',
}

function handleSelect(item: Notification): void {
  emit('select', item)
}

function handleLoadMore(): void {
  emit('load-more')
}
</script>

<template>
  <div class="drawer-content">
    <div v-if="isLoading" class="drawer-empty">
      <div class="drawer-spinner"></div>
      <span>알림을 불러오는 중...</span>
    </div>

    <div v-else-if="items.length === 0" class="drawer-empty">
      <div class="drawer-empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </div>
      <span class="drawer-empty-text">알림이 없습니다</span>
    </div>

    <template v-else>
      <div
        v-for="item in items"
        :key="item.id"
        class="notification-item"
        :class="{ unread: !item.isRead }"
        @click="handleSelect(item)"
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

      <button
        v-if="hasMore"
        type="button"
        class="drawer-load-more"
        :disabled="isLoadingMore"
        @click="handleLoadMore"
      >
        {{ isLoadingMore ? '불러오는 중...' : '더 보기' }}
      </button>
    </template>
  </div>
</template>
