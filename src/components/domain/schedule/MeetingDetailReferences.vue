<script setup lang="ts">
import type { MeetingDetailResponse } from '@/api/scheduleApi'
import { formatDateTime } from '@/utils/date'

// ─── Props / Emits ─────────────────────────────────────────────────────────

defineProps<{
  references: MeetingDetailResponse['references']
  deletingReferenceId?: string | null
  isBusy: boolean
  uploadError: string
  addReferenceError?: string
  deleteReferenceError?: string
}>()

const emit = defineEmits<{
  'select-files': [files: File[]]
  'delete-reference': [referenceId: string]
}>()

// ─── 이벤트 핸들러 ──────────────────────────────────────────────────────────

function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files || files.length === 0) return

  emit('select-files', Array.from(files))
  input.value = ''
}

function handleDeleteReference(referenceId: string): void {
  emit('delete-reference', referenceId)
}
</script>

<template>
  <ul v-if="references.length > 0" class="reference-list">
    <li v-for="reference in references" :key="reference.id" class="reference-item">
      <a
        v-if="reference.fileUrl"
        class="reference-title reference-link"
        :href="reference.fileUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ reference.title }}
      </a>
      <span v-else class="reference-title">{{ reference.title }}</span>
      <span class="reference-date">{{ formatDateTime(reference.createdAt) }}</span>
      <button
        type="button"
        class="reference-remove"
        :disabled="deletingReferenceId === reference.id"
        @click="handleDeleteReference(reference.id)"
      >
        <span v-if="deletingReferenceId === reference.id" class="spinner" />
        <span v-else>×</span>
      </button>
    </li>
  </ul>
  <p v-else class="empty-state">첨부된 파일이 없습니다.</p>

  <label
    for="reference-file-input"
    class="file-select-btn"
    :class="{ 'file-select-btn--disabled': isBusy }"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
    파일 추가
  </label>
  <input
    id="reference-file-input"
    type="file"
    class="file-input"
    multiple
    :disabled="isBusy"
    @change="handleFileSelect"
  />
  <p v-if="isBusy" class="field-hint">첨부파일을 추가하는 중...</p>
  <p v-if="uploadError" class="field-hint verify-error">{{ uploadError }}</p>
  <p v-if="addReferenceError" class="field-hint verify-error">{{ addReferenceError }}</p>
  <p v-if="deleteReferenceError" class="field-hint verify-error">{{ deleteReferenceError }}</p>
</template>
