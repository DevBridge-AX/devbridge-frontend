<script setup lang="ts">
import { ref, watch } from 'vue'
import { ownerConfirmationService } from '@/services/ownerConfirmationService'
import type { OwnerConfirmationResponse } from '@/api/ownerConfirmationApi'

const props = defineProps<{
  isOpen: boolean
  confirmationId: string | null
  readOnly: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const isLoading = ref(false)
const loadError = ref('')
const confirmation = ref<OwnerConfirmationResponse | null>(null)
const answerText = ref('')
const isSubmitting = ref(false)
const submitError = ref('')

function resetState() {
  isLoading.value = false
  loadError.value = ''
  confirmation.value = null
  answerText.value = ''
  isSubmitting.value = false
  submitError.value = ''
}

async function fetchDetail() {
  if (!props.confirmationId) return

  isLoading.value = true
  loadError.value = ''

  try {
    confirmation.value = await ownerConfirmationService.fetchConfirmation(props.confirmationId)
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit() {
  if (!props.confirmationId || !answerText.value.trim()) return

  isSubmitting.value = true
  submitError.value = ''

  try {
    await ownerConfirmationService.submitAnswer(props.confirmationId, answerText.value.trim())
    emit('close')
  } catch (e: unknown) {
    submitError.value = e instanceof Error ? e.message : '답변 제출에 실패했습니다.'
  } finally {
    isSubmitting.value = false
  }
}

function handleClose() {
  emit('close')
}

function handleOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      resetState()
      fetchDetail()
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="answer-modal">
      <div
        v-if="props.isOpen"
        class="answer-modal-overlay"
        @click="handleOverlayClick"
      >
        <div class="answer-modal-card">
          <!-- Header -->
          <div class="answer-modal-header">
            <h3 class="answer-modal-title">
              {{ confirmation?.status === 'ANSWERED' || props.readOnly ? '담당자 답변 확인' : '담당자 답변 작성' }}
            </h3>
            <button
              type="button"
              class="answer-modal-close"
              aria-label="닫기"
              @click="handleClose"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Loading -->
          <div v-if="isLoading" class="answer-modal-body answer-modal-center">
            <div class="answer-modal-spinner"></div>
            <span class="answer-modal-loading-text">불러오는 중...</span>
          </div>

          <!-- Error -->
          <div v-else-if="loadError" class="answer-modal-body answer-modal-center">
            <p class="answer-modal-error-text">{{ loadError }}</p>
            <button type="button" class="answer-modal-retry" @click="fetchDetail">다시 시도</button>
          </div>

          <!-- Content -->
          <template v-else-if="confirmation">
            <div class="answer-modal-body">
              <!-- Question Section -->
              <div class="answer-modal-section">
                <div class="answer-modal-info-row">
                  <span class="answer-modal-label">질문자</span>
                  <span class="answer-modal-value">{{ confirmation.requesterName }}</span>
                </div>
                <div v-if="confirmation.relatedDocumentTitle" class="answer-modal-info-row">
                  <span class="answer-modal-label">관련 문서</span>
                  <span class="answer-modal-value document-tag">{{ confirmation.relatedDocumentTitle }}</span>
                </div>
                <div class="answer-modal-info-row">
                  <span class="answer-modal-label">요청 시각</span>
                  <span class="answer-modal-value">{{ formatDateTime(confirmation.createdAt) }}</span>
                </div>
                <div class="answer-modal-question">
                  <span class="answer-modal-label">질문 내용</span>
                  <p class="answer-modal-question-text">{{ confirmation.questionContent }}</p>
                </div>
              </div>

              <div class="answer-modal-divider"></div>

              <!-- Answer Section: Read-only -->
              <div v-if="confirmation.status === 'ANSWERED'" class="answer-modal-section">
                <div class="answer-modal-info-row">
                  <span class="answer-modal-label">답변자</span>
                  <span class="answer-modal-value">{{ confirmation.assignedOwnerName }}</span>
                </div>
                <div v-if="confirmation.answeredAt" class="answer-modal-info-row">
                  <span class="answer-modal-label">답변 시각</span>
                  <span class="answer-modal-value">{{ formatDateTime(confirmation.answeredAt) }}</span>
                </div>
                <div class="answer-modal-question">
                  <span class="answer-modal-label">답변 내용</span>
                  <p class="answer-modal-question-text">{{ confirmation.answerContent }}</p>
                </div>
              </div>

              <!-- Answer Section: Write -->
              <div v-else-if="!props.readOnly" class="answer-modal-section">
                <label class="answer-modal-label" for="answer-textarea">답변 작성</label>
                <textarea
                  id="answer-textarea"
                  v-model="answerText"
                  class="answer-modal-textarea"
                  rows="5"
                  placeholder="답변을 입력해 주세요..."
                ></textarea>
                <p v-if="submitError" class="answer-modal-submit-error">{{ submitError }}</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="answer-modal-footer">
              <template v-if="confirmation.status === 'PENDING' && !props.readOnly">
                <button
                  type="button"
                  class="answer-modal-btn answer-modal-btn--secondary"
                  :disabled="isSubmitting"
                  @click="handleClose"
                >취소</button>
                <button
                  type="button"
                  class="answer-modal-btn answer-modal-btn--primary"
                  :disabled="isSubmitting || !answerText.trim()"
                  @click="handleSubmit"
                >
                  <span v-if="isSubmitting" class="answer-modal-btn-spinner"></span>
                  답변 제출
                </button>
              </template>
              <button
                v-else
                type="button"
                class="answer-modal-btn answer-modal-btn--secondary"
                @click="handleClose"
              >닫기</button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ──────────────────────────────────────────────────── */
.answer-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* ── Card ─────────────────────────────────────────────────────── */
.answer-modal-card {
  width: 100%;
  max-width: 540px;
  max-height: calc(100vh - 48px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────────── */
.answer-modal-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.answer-modal-title {
  font-size: 17px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.answer-modal-close {
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

.answer-modal-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

/* ── Body ─────────────────────────────────────────────────────── */
.answer-modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
}

.answer-modal-body::-webkit-scrollbar {
  width: 5px;
}

.answer-modal-body::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.answer-modal-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 12px;
}

/* ── Section ──────────────────────────────────────────────────── */
.answer-modal-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-modal-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 16px 0;
}

/* ── Info Row ─────────────────────────────────────────────────── */
.answer-modal-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.answer-modal-label {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  min-width: 64px;
  flex-shrink: 0;
}

.answer-modal-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
}

.document-tag {
  background: #eff6ff;
  color: #2563eb;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 13px;
}

/* ── Question / Answer Content ────────────────────────────────── */
.answer-modal-question {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.answer-modal-question-text {
  margin: 0;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: #334155;
  white-space: pre-wrap;
}

/* ── Textarea ─────────────────────────────────────────────────── */
.answer-modal-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  outline: none;
  background: #f8fafc;
  resize: vertical;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.answer-modal-textarea:focus {
  border-color: #3b82f6;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.answer-modal-submit-error {
  margin: 4px 0 0;
  font-size: 13px;
  color: #dc2626;
}

/* ── Loading / Error ──────────────────────────────────────────── */
.answer-modal-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: answer-spin 0.6s linear infinite;
}

@keyframes answer-spin {
  to { transform: rotate(360deg); }
}

.answer-modal-loading-text {
  font-size: 14px;
  color: #94a3b8;
}

.answer-modal-error-text {
  font-size: 14px;
  color: #dc2626;
  text-align: center;
  margin: 0;
}

.answer-modal-retry {
  padding: 6px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: transparent;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.answer-modal-retry:hover {
  background: #eff6ff;
}

/* ── Footer ───────────────────────────────────────────────────── */
.answer-modal-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid #e2e8f0;
}

.answer-modal-btn {
  height: 40px;
  padding: 0 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.answer-modal-btn--secondary {
  background: #f1f5f9;
  color: #475569;
}

.answer-modal-btn--secondary:hover {
  background: #e2e8f0;
}

.answer-modal-btn--primary {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

.answer-modal-btn--primary:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.answer-modal-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.answer-modal-btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: answer-spin 0.6s linear infinite;
}

/* ── Transition ───────────────────────────────────────────────── */
.answer-modal-enter-active {
  transition: opacity 0.25s ease;
}

.answer-modal-leave-active {
  transition: opacity 0.2s ease;
}

.answer-modal-enter-from,
.answer-modal-leave-to {
  opacity: 0;
}

.answer-modal-enter-active .answer-modal-card {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.answer-modal-leave-active .answer-modal-card {
  transition: transform 0.2s ease;
}

.answer-modal-enter-from .answer-modal-card {
  transform: scale(0.92) translateY(12px);
}

.answer-modal-leave-to .answer-modal-card {
  transform: scale(0.96) translateY(6px);
}

/* ── Dark Theme ───────────────────────────────────────────────── */
:global(.dark-theme) .answer-modal-overlay {
  background: rgba(0, 0, 0, 0.55);
}

:global(.dark-theme) .answer-modal-card {
  background: #0f172a;
  border-color: #1e293b;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

:global(.dark-theme) .answer-modal-header {
  border-bottom-color: #1e293b;
}

:global(.dark-theme) .answer-modal-title {
  color: #f1f5f9;
}

:global(.dark-theme) .answer-modal-close {
  color: #94a3b8;
}

:global(.dark-theme) .answer-modal-close:hover {
  background: #1e293b;
  color: #f1f5f9;
}

:global(.dark-theme) .answer-modal-label {
  color: #64748b;
}

:global(.dark-theme) .answer-modal-value {
  color: #e2e8f0;
}

:global(.dark-theme) .document-tag {
  background: #1e3a8a;
  color: #93bbfd;
}

:global(.dark-theme) .answer-modal-question-text {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

:global(.dark-theme) .answer-modal-textarea {
  background: #1e293b;
  border-color: #334155;
  color: #f1f5f9;
}

:global(.dark-theme) .answer-modal-textarea:focus {
  border-color: #3b82f6;
  background: #1e293b;
}

:global(.dark-theme) .answer-modal-divider {
  background: #1e293b;
}

:global(.dark-theme) .answer-modal-footer {
  border-top-color: #1e293b;
}

:global(.dark-theme) .answer-modal-btn--secondary {
  background: #1e293b;
  color: #e2e8f0;
}

:global(.dark-theme) .answer-modal-btn--secondary:hover {
  background: #334155;
}

:global(.dark-theme) .answer-modal-retry {
  border-color: #334155;
  color: #60a5fa;
}

:global(.dark-theme) .answer-modal-retry:hover {
  background: #1e293b;
}

:global(.dark-theme) .answer-modal-spinner {
  border-color: #334155;
  border-top-color: #60a5fa;
}
</style>
