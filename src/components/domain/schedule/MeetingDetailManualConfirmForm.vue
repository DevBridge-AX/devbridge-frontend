<script setup lang="ts">
import { ref } from 'vue'
import type { ManualConfirmRequest } from '@/api/scheduleApi'

// ─── Props / Emits ─────────────────────────────────────────────────────────

defineProps<{
  isConfirmingManually?: boolean
  confirmManuallyError?: string
}>()

const emit = defineEmits<{
  submit: [payload: ManualConfirmRequest]
  cancel: []
}>()

// ─── 회의 시간 수동 확정 (Host 전용) ─────────────────────────────────────────

// 폼이 열릴 때(마운트) 입력값을 빈 상태로 초기화한다.
const manualConfirmStart = ref('')
const manualConfirmEnd = ref('')
const manualConfirmFormError = ref('')

function cancelManualConfirm(): void {
  emit('cancel')
}

function submitManualConfirm(): void {
  manualConfirmFormError.value = ''

  if (!manualConfirmStart.value || !manualConfirmEnd.value) {
    manualConfirmFormError.value = '시작 시간과 종료 시간을 모두 입력해 주세요.'
    return
  }

  const start = new Date(manualConfirmStart.value)
  const end = new Date(manualConfirmEnd.value)

  if (end.getTime() <= start.getTime()) {
    manualConfirmFormError.value = '종료 시간은 시작 시간보다 이후여야 합니다.'
    return
  }

  emit('submit', {
    confirmedStartTime: start.toISOString(),
    confirmedEndTime: end.toISOString(),
  })
}
</script>

<template>
  <!-- 시간 수동 확정 폼 (Host 전용) -->
  <form class="edit-form" @submit.prevent="submitManualConfirm">
    <div class="field">
      <label class="field-label" for="manual-confirm-start">시작 시간</label>
      <input
        id="manual-confirm-start"
        v-model="manualConfirmStart"
        type="datetime-local"
        class="field-input"
      />
    </div>

    <div class="field">
      <label class="field-label" for="manual-confirm-end">종료 시간</label>
      <input
        id="manual-confirm-end"
        v-model="manualConfirmEnd"
        type="datetime-local"
        class="field-input"
      />
    </div>

    <p v-if="manualConfirmFormError" class="field-hint verify-error">{{ manualConfirmFormError }}</p>
    <p v-if="confirmManuallyError" class="field-hint verify-error">{{ confirmManuallyError }}</p>

    <div class="edit-actions">
      <button
        type="button"
        class="btn btn--secondary"
        :disabled="isConfirmingManually"
        @click="cancelManualConfirm"
      >
        취소
      </button>
      <button type="submit" class="btn btn--primary" :disabled="isConfirmingManually">
        <span v-if="isConfirmingManually" class="spinner" />
        확정
      </button>
    </div>
  </form>
</template>
