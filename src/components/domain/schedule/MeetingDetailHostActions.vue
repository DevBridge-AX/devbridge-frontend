<script setup lang="ts">
import type { MeetingStatus } from '@/api/scheduleApi'

// ─── Props / Emits ─────────────────────────────────────────────────────────

defineProps<{
  status: MeetingStatus
  isReopeningMeeting?: boolean
  isCancelingMeeting?: boolean
}>()

const emit = defineEmits<{
  'start-edit': []
  'start-manual-confirm': []
  'reopen-meeting': []
  'cancel-meeting': []
}>()

// ─── 이벤트 핸들러 ──────────────────────────────────────────────────────────

function handleStartEdit(): void {
  emit('start-edit')
}

function handleStartManualConfirm(): void {
  emit('start-manual-confirm')
}

function handleReopenMeeting(): void {
  emit('reopen-meeting')
}

function handleCancelMeeting(): void {
  emit('cancel-meeting')
}
</script>

<template>
  <!-- 호스트 전용 액션 (정보 수정 / 취소 / 수동 확정 / 재조율) -->
  <div class="host-actions">
    <button type="button" class="btn btn--secondary" @click="handleStartEdit">
      회의 정보 수정
    </button>
    <button
      v-if="status === 'GATHERING' || status === 'SELECTING'"
      type="button"
      class="btn btn--secondary"
      @click="handleStartManualConfirm"
    >
      시간 수동 확정
    </button>
    <button
      v-if="status === 'SELECTING'"
      type="button"
      class="btn btn--secondary"
      :disabled="isReopeningMeeting"
      @click="handleReopenMeeting"
    >
      <span v-if="isReopeningMeeting" class="spinner" />
      재조율 요청
    </button>
    <button
      v-if="status !== 'CANCELED'"
      type="button"
      class="btn btn--danger"
      :disabled="isCancelingMeeting"
      @click="handleCancelMeeting"
    >
      <span v-if="isCancelingMeeting" class="spinner" />
      회의 취소
    </button>
  </div>
</template>
