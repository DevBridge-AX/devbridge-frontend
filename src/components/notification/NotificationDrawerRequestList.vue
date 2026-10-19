<script setup lang="ts">
import type { OwnerConfirmationResponse } from '@/api/ownerConfirmationApi'
import { formatRelativeTime } from '@/utils/date'

// ─── Props / Emits ─────────────────────────────────────────────────────────

defineProps<{
  items: OwnerConfirmationResponse[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  select: [item: OwnerConfirmationResponse]
  'load-more': []
}>()

// ─── 요청 상태 → 라벨 매핑 ──────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기 중',
  ANSWERED: '답변 완료',
}

function handleSelect(item: OwnerConfirmationResponse): void {
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
      <span>요청 목록을 불러오는 중...</span>
    </div>

    <div v-else-if="items.length === 0" class="drawer-empty">
      <div class="drawer-empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      </div>
      <span class="drawer-empty-text">요청한 확인 건이 없습니다</span>
    </div>

    <template v-else>
      <div
        v-for="req in items"
        :key="req.id"
        class="notification-item"
        @click="handleSelect(req)"
      >
        <div class="notification-item-icon">
          {{ req.status === 'ANSWERED' ? '✅' : '⏳' }}
        </div>
        <div class="notification-item-body">
          <div class="notification-item-title">
            <span>{{ req.assignedOwnerName }}</span>
            <span class="request-status-badge" :class="req.status.toLowerCase()">
              {{ STATUS_LABEL[req.status] ?? req.status }}
            </span>
          </div>
          <div class="notification-item-message">{{ req.questionContent }}</div>
          <div class="notification-item-time">{{ formatRelativeTime(req.createdAt) }}</div>
        </div>
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
