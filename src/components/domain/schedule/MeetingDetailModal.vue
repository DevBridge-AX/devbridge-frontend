<script setup lang="ts">
import { ref } from 'vue'
import type {
  MeetingDetailResponse,
  MeetingReferenceRequest,
  MeetingStatus,
  ParticipantRole,
  ParticipantStatus,
  TimeSlot,
} from '@/api/scheduleApi'
import { documentService } from '@/services/documentService'

// ─── Props / Emits ─────────────────────────────────────────────────────────

defineProps<{
  isOpen: boolean
  meeting: MeetingDetailResponse | null
  isLoading: boolean
  loadError?: string
  isAddingReference?: boolean
  addReferenceError?: string
  deletingReferenceId?: string | null
  deleteReferenceError?: string
}>()

const emit = defineEmits<{
  close: []
  'open-response': [meetingId: string]
  'add-reference': [payload: MeetingReferenceRequest]
  'delete-reference': [referenceId: string]
}>()

// ─── 첨부파일 업로드 ──────────────────────────────────────────────────────────

const isUploadingFile = ref(false)
const uploadError = ref('')

async function handleFileSelect(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files || files.length === 0) return

  uploadError.value = ''
  isUploadingFile.value = true

  try {
    for (const file of Array.from(files)) {
      const { fileUrl } = await documentService.uploadDocument(file)
      emit('add-reference', {
        referenceType: 'DIRECT_FILE',
        fileUrl,
        title: file.name,
      })
    }
  } catch (error: unknown) {
    uploadError.value = error instanceof Error ? error.message : '파일 업로드에 실패했습니다.'
  } finally {
    isUploadingFile.value = false
    input.value = ''
  }
}

function handleDeleteReference(referenceId: string): void {
  emit('delete-reference', referenceId)
}

// ─── 상태 → 라벨 / 배지 클래스 매핑 ────────────────────────────────────────

const STATUS_LABELS: Record<MeetingStatus, string> = {
  GATHERING: '시간 수집 중',
  SELECTING: '시간 조율 중',
  CONFIRMED: '확정',
  CANCELED: '취소됨',
}

const STATUS_BADGE_CLASSES: Record<MeetingStatus, string> = {
  GATHERING: 'status-badge--gathering',
  SELECTING: 'status-badge--selecting',
  CONFIRMED: 'status-badge--confirmed',
  CANCELED: 'status-badge--canceled',
}

const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  HOST: '주최자',
  ATTENDEE: '참석자',
}

// NOTE: 백엔드 ParticipantStatus에는 현재 PENDING/RESPONDED만 정의되어 있음.
// DECLINED 응답 현황은 추후 타입 확장 후 추가 필요.
const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  PENDING: '응답 대기',
  RESPONDED: '응답 완료',
}

const PARTICIPANT_STATUS_BADGE_CLASSES: Record<ParticipantStatus, string> = {
  PENDING: 'participant-badge--pending',
  RESPONDED: 'participant-badge--responded',
}

// ─── 일시 포맷 ──────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}

function formatTimeRange(slot: TimeSlot): string {
  const start = new Date(slot.startTime)
  const end = new Date(slot.endTime)
  const datePart = start.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short' })
  const startTime = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} ${startTime} ~ ${endTime}`
}

function formatCreatedAt(iso: string): string {
  const date = new Date(iso)
  const datePart = date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
  const timePart = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} ${timePart}`
}

function isMeetingLinkUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function formatConfirmedRange(meeting: MeetingDetailResponse): string {
  if (!meeting.confirmedStartTime || !meeting.confirmedEndTime) return '-'

  const start = new Date(meeting.confirmedStartTime)
  const end = new Date(meeting.confirmedEndTime)
  const datePart = start.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const startTime = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return `${datePart} ${startTime} ~ ${endTime}`
}

// ─── 이벤트 핸들러 ──────────────────────────────────────────────────────────

function handleClose(): void {
  emit('close')
}

function handleOpenResponse(meetingId: string): void {
  emit('open-response', meetingId)
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">{{ meeting?.title ?? '회의 상세' }}</h3>
        <button class="modal-close-btn" type="button" @click="handleClose">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div v-if="isLoading" class="loading-state">
        <span class="spinner spinner--lg" />
        <p>회의 정보를 불러오는 중...</p>
      </div>

      <p v-else-if="loadError" class="status-message status-message--error">{{ loadError }}</p>

      <template v-else-if="meeting">
        <span class="status-badge" :class="STATUS_BADGE_CLASSES[meeting.status]">
          {{ STATUS_LABELS[meeting.status] }}
        </span>

        <!-- 목적 -->
        <div v-if="meeting.purpose" class="info-box">
          <p class="info-label">목적</p>
          <p class="info-text">{{ meeting.purpose }}</p>
        </div>

        <!-- 아젠다 -->
        <div v-if="meeting.agenda" class="info-box">
          <p class="info-label">아젠다</p>
          <p class="info-text">{{ meeting.agenda }}</p>
        </div>

        <!-- 장소 / 회의 링크 -->
        <div v-if="meeting.location" class="info-box">
          <p class="info-label">장소 / 회의 링크</p>
          <a
            v-if="isMeetingLinkUrl(meeting.location)"
            class="info-text info-link"
            :href="meeting.location"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ meeting.location }}
          </a>
          <p v-else class="info-text">{{ meeting.location }}</p>
        </div>

        <!-- GATHERING: 참석자 목록 + 응답 현황 -->
        <template v-if="meeting.status === 'GATHERING'">
          <h4 class="section-title">참석자 응답 현황</h4>
          <ul v-if="meeting.participants.length > 0" class="participant-list">
            <li v-for="p in meeting.participants" :key="p.employeeId" class="participant-item">
              <span class="participant-id">{{ p.employeeId }}</span>
              <span class="participant-role">{{ PARTICIPANT_ROLE_LABELS[p.role] }}</span>
              <span class="participant-badge" :class="PARTICIPANT_STATUS_BADGE_CLASSES[p.status]">
                {{ PARTICIPANT_STATUS_LABELS[p.status] }}
              </span>
            </li>
          </ul>
          <p v-else class="empty-state">참석자가 없습니다.</p>

          <button type="button" class="btn btn--primary" @click="handleOpenResponse(meeting.meetingId)">
            응답하기
          </button>
        </template>

        <!-- SELECTING: 후보 시간 목록 -->
        <template v-else-if="meeting.status === 'SELECTING'">
          <p class="status-message">시간 조율 중입니다.</p>
          <h4 class="section-title">후보 시간</h4>
          <ul v-if="meeting.topCandidateTimes.length > 0" class="candidate-list">
            <li v-for="(slot, index) in meeting.topCandidateTimes" :key="index" class="candidate-item">
              {{ formatTimeRange(slot) }}
            </li>
          </ul>
          <p v-else class="empty-state">아직 제안된 후보 시간이 없습니다.</p>
        </template>

        <!-- CONFIRMED: 확정 일시 + 소요 시간 -->
        <template v-else-if="meeting.status === 'CONFIRMED'">
          <div class="confirmed-box">
            <p class="confirmed-label">확정 일시</p>
            <p class="confirmed-time">{{ formatConfirmedRange(meeting) }}</p>
            <p class="confirmed-duration">소요 시간 {{ formatDuration(meeting.durationMinutes) }}</p>
          </div>
        </template>

        <!-- CANCELED -->
        <template v-else>
          <p class="status-message">취소된 회의입니다.</p>
        </template>

        <!-- 첨부파일 -->
        <h4 class="section-title section-title--spaced">첨부파일</h4>
        <ul v-if="meeting.references.length > 0" class="reference-list">
          <li v-for="reference in meeting.references" :key="reference.id" class="reference-item">
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
            <span class="reference-date">{{ formatCreatedAt(reference.createdAt) }}</span>
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
          :class="{ 'file-select-btn--disabled': isUploadingFile || isAddingReference }"
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
          :disabled="isUploadingFile || isAddingReference"
          @change="handleFileSelect"
        />
        <p v-if="isUploadingFile || isAddingReference" class="field-hint">첨부파일을 추가하는 중...</p>
        <p v-if="uploadError" class="field-hint verify-error">{{ uploadError }}</p>
        <p v-if="addReferenceError" class="field-hint verify-error">{{ addReferenceError }}</p>
        <p v-if="deleteReferenceError" class="field-hint verify-error">{{ deleteReferenceError }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ── 모달 레이아웃 ───────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.25s ease;
  font-family: 'Inter', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: rgba(18, 18, 24, 0.95);
  border: 1px solid rgba(164, 147, 232, 0.2);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  animation: zoom-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes zoom-in {
  from { transform: scale(0.92); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.modal-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: #f0eeff;
}
.modal-close-btn {
  background: transparent;
  border: none;
  color: rgba(240, 238, 255, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
  flex-shrink: 0;
  transition: background-color 0.2s, color 0.2s;
}
.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f0eeff;
}

/* ── 로딩 상태 ─────────────────────────────────────────────────────── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 20px;
  font-size: 13px;
  color: rgba(164, 147, 232, 0.55);
}
.spinner--lg {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(164, 147, 232, 0.25);
  border-top-color: #a493e8;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #f0eeff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 상태 배지 ──────────────────────────────────────────────────────── */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  margin-bottom: 16px;
}
.status-badge--gathering {
  color: #f5d142;
  background: rgba(245, 209, 66, 0.12);
}
.status-badge--selecting {
  color: #f5a623;
  background: rgba(245, 166, 35, 0.12);
}
.status-badge--confirmed {
  color: #6fa8f5;
  background: rgba(111, 168, 245, 0.12);
}
.status-badge--canceled {
  color: rgba(240, 238, 255, 0.45);
  background: rgba(255, 255, 255, 0.05);
}

/* ── 섹션 ──────────────────────────────────────────────────────────── */
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(240, 238, 255, 0.5);
  letter-spacing: 0.2px;
  text-transform: uppercase;
  margin: 0 0 10px;
}
.section-title--spaced {
  margin-top: 20px;
}
.field-hint {
  font-size: 11px;
  color: rgba(240, 238, 255, 0.45);
  margin: 8px 0 0;
  padding: 0 2px;
}
.verify-error {
  color: #f56565 !important;
}
.status-message {
  font-size: 13px;
  color: rgba(240, 238, 255, 0.65);
  margin: 0 0 16px;
}
.status-message--error {
  color: #f56565;
}
.empty-state {
  font-size: 13px;
  color: rgba(240, 238, 255, 0.45);
  margin: 0 0 16px;
}

/* ── 요약/아젠다, 장소/링크 ─────────────────────────────────────────── */
.info-box {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(164, 147, 232, 0.1);
  margin: 0 0 12px;
}
.info-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(164, 147, 232, 0.65);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin: 0 0 6px;
}
.info-text {
  font-size: 13px;
  color: #f0eeff;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.info-link {
  display: block;
  color: #a493e8;
  text-decoration: none;
}
.info-link:hover {
  text-decoration: underline;
}

/* ── 참석자 목록 ────────────────────────────────────────────────────── */
.participant-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 20px;
  padding: 0;
}
.participant-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(164, 147, 232, 0.1);
}
.participant-id {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #f0eeff;
}
.participant-role {
  font-size: 12px;
  color: rgba(240, 238, 255, 0.5);
}
.participant-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.participant-badge--pending {
  color: #f5a623;
  background: rgba(245, 166, 35, 0.12);
}
.participant-badge--responded {
  color: #48c78e;
  background: rgba(72, 199, 142, 0.12);
}

/* ── 후보 시간 목록 ─────────────────────────────────────────────────── */
.candidate-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
}
.candidate-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(164, 147, 232, 0.1);
  font-size: 13px;
  color: #f0eeff;
  font-weight: 500;
}

/* ── 확정 일시 ──────────────────────────────────────────────────────── */
.confirmed-box {
  text-align: center;
  padding: 28px 16px;
  border-radius: 12px;
  background: rgba(164, 147, 232, 0.08);
  border: 1px solid rgba(164, 147, 232, 0.18);
}
.confirmed-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(164, 147, 232, 0.7);
  letter-spacing: 0.3px;
  text-transform: uppercase;
  margin: 0 0 8px;
}
.confirmed-time {
  font-size: 18px;
  font-weight: 700;
  color: #f0eeff;
  margin: 0 0 8px;
}
.confirmed-duration {
  font-size: 13px;
  color: rgba(240, 238, 255, 0.55);
  margin: 0;
}

/* ── 첨부파일 목록 ──────────────────────────────────────────────────── */
.reference-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 12px;
  padding: 0;
}
.reference-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(164, 147, 232, 0.1);
}
.reference-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #f0eeff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reference-link {
  color: #a493e8;
  text-decoration: none;
}
.reference-link:hover {
  text-decoration: underline;
}
.reference-date {
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(240, 238, 255, 0.4);
}
.reference-remove {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(240, 238, 255, 0.4);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
.reference-remove:hover:not(:disabled) {
  background: rgba(245, 101, 101, 0.15);
  color: #f56565;
}
.reference-remove:disabled {
  cursor: not-allowed;
}

/* ── 파일 입력 ──────────────────────────────────────────────────────── */
.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
}
.file-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px dashed rgba(164, 147, 232, 0.3);
  background: transparent;
  color: #a493e8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}
.file-select-btn:hover {
  background: rgba(164, 147, 232, 0.1);
}
.file-select-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* ── 버튼 ──────────────────────────────────────────────────────────── */
.btn {
  width: 100%;
  height: 44px;
  padding: 0 24px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  font-family: inherit;
}
.btn:active {
  transform: translateY(1px);
}
.btn--primary {
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(164, 147, 232, 0.25);
}
.btn--primary:hover {
  opacity: 0.95;
}
</style>
