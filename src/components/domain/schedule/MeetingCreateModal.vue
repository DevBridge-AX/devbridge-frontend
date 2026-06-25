<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CreatedMeetingPayload, MeetingReferenceRequest, WorkspaceMemberResponse } from '@/api/scheduleApi'
import { documentService } from '@/services/documentService'
import MeetingDateTimePicker from '@/components/domain/schedule/MeetingDateTimePicker.vue'

// ─── Props / Emits ─────────────────────────────────────────────────────────

const props = defineProps<{
  isOpen: boolean
  memberSearchResults: WorkspaceMemberResponse[]
  isSubmitting?: boolean
  submitError?: string
}>()

const emit = defineEmits<{
  close: []
  'search-members': [keyword: string]
  created: [payload: CreatedMeetingPayload]
}>()

// ─── 상수 ──────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: 30, label: '30분' },
  { value: 60, label: '1시간' },
  { value: 90, label: '1시간 30분' },
  { value: 120, label: '2시간' },
]

const MAX_TIME_SLOTS = 3

// ─── 폼 상태 ───────────────────────────────────────────────────────────────

const title = ref('')
const durationMinutes = ref(60)
const purpose = ref('')
const agenda = ref('')
const location = ref('')

const searchKeyword = ref('')
const selectedParticipants = ref<WorkspaceMemberResponse[]>([])

interface TimeSlotForm {
  startTime: string
  endTime: string
  endDateTouched: boolean
}

const timeSlots = ref<TimeSlotForm[]>([{ startTime: '', endTime: '', endDateTouched: false }])

const formError = ref('')

// ─── 첨부파일 ──────────────────────────────────────────────────────────────

interface AttachmentForm {
  id: string
  file: File
  status: 'uploading' | 'done' | 'error'
  fileUrl?: string
  errorMessage?: string
}

const attachments = ref<AttachmentForm[]>([])

const isUploadingAttachments = computed(() => attachments.value.some((a) => a.status === 'uploading'))

// ─── 모달 열릴 때 폼 초기화 ──────────────────────────────────────────────────

function resetForm(): void {
  title.value = ''
  durationMinutes.value = 60
  purpose.value = ''
  agenda.value = ''
  location.value = ''
  searchKeyword.value = ''
  selectedParticipants.value = []
  timeSlots.value = [{ startTime: '', endTime: '', endDateTouched: false }]
  attachments.value = []
  formError.value = ''
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

// ─── 참석자 검색 (300ms 디바운스) ────────────────────────────────────────────

let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined

watch(searchKeyword, (keyword) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    emit('search-members', keyword)
  }, 300)
})

const showDropdown = computed(
  () => searchKeyword.value.trim().length > 0 && props.memberSearchResults.length > 0,
)

function selectParticipant(member: WorkspaceMemberResponse): void {
  if (!selectedParticipants.value.some((p) => p.employeeId === member.employeeId)) {
    selectedParticipants.value.push(member)
  }
  searchKeyword.value = ''
}

function removeParticipant(employeeId: string): void {
  selectedParticipants.value = selectedParticipants.value.filter((p) => p.employeeId !== employeeId)
}

// ─── 가능 시간 슬롯 (최대 3개) ────────────────────────────────────────────────

function addTimeSlot(): void {
  if (timeSlots.value.length < MAX_TIME_SLOTS) {
    timeSlots.value.push({ startTime: '', endTime: '', endDateTouched: false })
  }
}

function removeTimeSlot(index: number): void {
  if (timeSlots.value.length > 1) {
    timeSlots.value.splice(index, 1)
  }
}

function getDatePart(iso: string): string {
  return iso.slice(0, 10)
}

function getTimePart(iso: string): string {
  return iso.slice(11)
}

function addMinutesToIso(iso: string, minutes: number): string {
  const date = new Date(iso)
  date.setMinutes(date.getMinutes() + minutes)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}:00`
}

function handleStartTimeChange(index: number, value: string): void {
  const slot = timeSlots.value[index]
  if (!slot) return

  slot.startTime = value

  if (!value || slot.endDateTouched) return

  if (slot.endTime) {
    const startDate = getDatePart(value)
    slot.endTime = `${startDate}T${getTimePart(slot.endTime)}`
  } else {
    slot.endTime = addMinutesToIso(value, durationMinutes.value)
  }
}

function handleEndTimeChange(index: number, value: string): void {
  const slot = timeSlots.value[index]
  if (!slot) return

  slot.endTime = value

  if (value && slot.startTime && getDatePart(value) !== getDatePart(slot.startTime)) {
    slot.endDateTouched = true
  }
}

// ─── 첨부파일 업로드 ──────────────────────────────────────────────────────────

async function handleFileSelect(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files || files.length === 0) return

  for (const file of Array.from(files)) {
    const attachment: AttachmentForm = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: 'uploading',
    }
    attachments.value.push(attachment)

    try {
      const { fileUrl } = await documentService.uploadDocument(file)
      attachment.status = 'done'
      attachment.fileUrl = fileUrl
    } catch (error: unknown) {
      attachment.status = 'error'
      attachment.errorMessage = error instanceof Error ? error.message : '파일 업로드에 실패했습니다.'
    }
  }

  input.value = ''
}

function removeAttachment(id: string): void {
  attachments.value = attachments.value.filter((a) => a.id !== id)
}

// ─── 생성 ──────────────────────────────────────────────────────────────────

function handleCreate(): void {
  formError.value = ''

  if (!title.value.trim()) {
    formError.value = '회의명을 입력해 주세요.'
    return
  }

  if (selectedParticipants.value.length === 0) {
    formError.value = '참석자를 1명 이상 선택해 주세요.'
    return
  }

  const validSlots = timeSlots.value.filter((slot) => slot.startTime && slot.endTime)
  if (validSlots.length === 0) {
    formError.value = '가능한 시간을 1개 이상 입력해 주세요.'
    return
  }

  for (const slot of validSlots) {
    if (slot.startTime >= slot.endTime) {
      formError.value = '종료 시간은 시작 시간보다 늦어야 합니다.'
      return
    }
  }

  if (isUploadingAttachments.value) {
    formError.value = '첨부파일 업로드가 완료될 때까지 기다려 주세요.'
    return
  }

  const references: MeetingReferenceRequest[] = attachments.value
    .filter((a): a is AttachmentForm & { fileUrl: string } => a.status === 'done' && !!a.fileUrl)
    .map((a) => ({
      referenceType: 'DIRECT_FILE',
      fileUrl: a.fileUrl,
      title: a.file.name,
    }))

  emit('created', {
    title: title.value.trim(),
    durationMinutes: durationMinutes.value,
    participantEmployeeIds: selectedParticipants.value.map((p) => p.employeeId),
    purpose: purpose.value.trim(),
    agenda: agenda.value.trim(),
    location: location.value.trim(),
    availableTimes: validSlots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
    references,
  })
}

function handleClose(): void {
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">회의 생성</h3>
        <button class="modal-close-btn" type="button" @click="handleClose">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <form class="modal-form" @submit.prevent="handleCreate">
        <!-- 회의명 -->
        <div class="field">
          <label class="field-label" for="meeting-title">회의명</label>
          <input
            id="meeting-title"
            v-model="title"
            type="text"
            class="field-input"
            placeholder="회의명을 입력하세요"
          />
        </div>

        <!-- 소요 시간 -->
        <div class="field">
          <label class="field-label" for="meeting-duration">소요 시간</label>
          <select id="meeting-duration" v-model.number="durationMinutes" class="field-input">
            <option v-for="opt in DURATION_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- 목적 -->
        <div class="field">
          <label class="field-label" for="meeting-purpose">목적</label>
          <input
            id="meeting-purpose"
            v-model="purpose"
            type="text"
            class="field-input"
            placeholder="회의 목적 (선택)"
          />
        </div>

        <!-- 아젠다 -->
        <div class="field">
          <label class="field-label" for="meeting-agenda">아젠다</label>
          <textarea
            id="meeting-agenda"
            v-model="agenda"
            class="field-textarea"
            placeholder="회의 아젠다 (선택)"
            rows="3"
          />
        </div>

        <!-- 장소 -->
        <div class="field">
          <label class="field-label" for="meeting-location">장소</label>
          <input
            id="meeting-location"
            v-model="location"
            type="text"
            class="field-input"
            placeholder="회의실 또는 화상회의 링크 (선택)"
          />
        </div>

        <!-- 참석자 -->
        <div class="field participant-field">
          <label class="field-label" for="participant-search">참석자</label>
          <div v-if="selectedParticipants.length > 0" class="chip-list">
            <span v-for="p in selectedParticipants" :key="p.employeeId" class="chip">
              {{ p.name }}
              <button type="button" class="chip-remove" @click="removeParticipant(p.employeeId)">×</button>
            </span>
          </div>
          <input
            id="participant-search"
            v-model="searchKeyword"
            type="text"
            class="field-input"
            placeholder="이름으로 검색"
            autocomplete="off"
          />
          <ul v-if="showDropdown" class="member-dropdown">
            <li
              v-for="member in memberSearchResults"
              :key="member.employeeId"
              class="member-option"
              @click="selectParticipant(member)"
            >
              <span class="member-name">{{ member.name }}</span>
              <span class="member-meta">{{ member.department }} · {{ member.position }}</span>
            </li>
          </ul>
        </div>

        <!-- 내 가능 시간 -->
        <div class="field">
          <label class="field-label">내 가능 시간 (최대 {{ MAX_TIME_SLOTS }}개)</label>
          <div v-for="(slot, index) in timeSlots" :key="index" class="time-slot-row">
            <MeetingDateTimePicker
              :model-value="slot.startTime"
              @update:model-value="(value) => handleStartTimeChange(index, value)"
            />
            <span class="time-slot-sep">~</span>
            <MeetingDateTimePicker
              :model-value="slot.endTime"
              @update:model-value="(value) => handleEndTimeChange(index, value)"
            />
            <button
              type="button"
              class="slot-remove-btn"
              :disabled="timeSlots.length <= 1"
              @click="removeTimeSlot(index)"
            >
              ×
            </button>
          </div>
          <button
            type="button"
            class="slot-add-btn"
            :disabled="timeSlots.length >= MAX_TIME_SLOTS"
            @click="addTimeSlot"
          >
            + 시간 추가
          </button>
        </div>

        <!-- 첨부파일 -->
        <div class="field">
          <label class="field-label" for="meeting-attachments">첨부파일</label>
          <label for="meeting-attachments" class="file-select-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            파일 선택
          </label>
          <input
            id="meeting-attachments"
            type="file"
            class="file-input"
            multiple
            @change="handleFileSelect"
          />
          <ul v-if="attachments.length > 0" class="attachment-list">
            <li v-for="attachment in attachments" :key="attachment.id" class="attachment-item">
              <span class="attachment-name">{{ attachment.file.name }}</span>
              <span v-if="attachment.status === 'uploading'" class="spinner" />
              <span v-else-if="attachment.status === 'error'" class="attachment-error">
                {{ attachment.errorMessage }}
              </span>
              <button type="button" class="attachment-remove" @click="removeAttachment(attachment.id)">×</button>
            </li>
          </ul>
        </div>

        <p v-if="formError" class="field-hint verify-error">{{ formError }}</p>
        <p v-if="submitError" class="field-hint verify-error">{{ submitError }}</p>

        <div class="modal-actions">
          <button type="button" class="btn btn--secondary" :disabled="isSubmitting" @click="handleClose">
            취소
          </button>
          <button type="submit" class="btn btn--primary" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="spinner" />
            생성
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* ══ Meeting Create Modal (Dashboard Unified — Light) ══ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(15,18,32,.48); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  padding: 32px;
}
.modal-content {
  width: min(580px, calc(100vw - 48px));
  max-height: calc(100vh - 64px);
  display: flex; flex-direction: column;
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #E8EAF2);
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(20,24,48,.18);
  overflow: hidden;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 28px 16px; border-bottom: 1px solid var(--card-border, #E8EAF2);
}
.modal-title { font-size: 18px; font-weight: 700; color: var(--text-body, #1B2031); margin: 0; }
.modal-close-btn {
  width: 32px; height: 32px; border: 0; border-radius: 8px;
  background: var(--page-bg, #F6F7FB); color: var(--text-light, #9AA0BD);
  cursor: pointer; display: grid; place-items: center;
}
.modal-close-btn:hover { background: var(--card-border, #E8EAF2); color: var(--text-body, #1B2031); }
.modal-form {
  padding: 20px 28px 24px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 14px;
}

/* ── Fields ──────────────────────────────────────────────────── */
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--text-body, #1B2031); }
.field-input, .field-textarea {
  width: 100%; box-sizing: border-box;
  padding: 0 12px; height: 44px;
  border-radius: 10px; border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff); color: var(--text-body, #1B2031);
  font-family: var(--font-ui); font-size: 13px; outline: none;
  transition: border-color .15s;
}
.field-textarea { min-height: 72px; padding: 10px 12px; resize: vertical; }
.field-input::placeholder, .field-textarea::placeholder { color: var(--text-light, #9AA0BD); }
.field-input:focus, .field-textarea:focus { border-color: var(--brand-indigo, #5B52E3); box-shadow: 0 0 0 3px rgba(91,82,227,.1); }
select.field-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239AA0BD' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; cursor: pointer; }
.field-hint { font-size: 11px; color: #e67700; margin: 0; }
.verify-error { color: var(--danger-text, #D45D5D) !important; }

/* ── Participants ──────────────────────────────────────────────── */
.participant-field { position: relative; }
.chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px 4px 10px; border-radius: 999px; background: var(--brand-light, #F0F2FE); color: var(--brand-chip-text, #4960CD); font-size: 11px; font-weight: 600; }
.chip-remove { background: transparent; border: 0; color: inherit; cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px; }
.chip-remove:hover { color: var(--danger-text, #D45D5D); }
.member-dropdown {
  position: absolute; top: 100%; left: 0; right: 0; margin: 2px 0 0; padding: 4px; list-style: none;
  background: var(--card-bg, #fff); border: 1px solid var(--card-border, #E8EAF2);
  border-radius: 10px; box-shadow: var(--shadow-lg, 0 8px 28px rgba(27,32,49,.08));
  max-height: 180px; overflow-y: auto; z-index: 10;
}
.member-option { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
.member-option:hover { background: var(--brand-light, #F0F2FE); }
.member-name { font-size: 12px; font-weight: 600; color: var(--text-body, #1B2031); }
.member-meta { font-size: 10px; color: var(--text-light, #9AA0BD); }

/* ── Time Slots ────────────────────────────────────────────────── */
.time-slot-row { display: flex; align-items: center; gap: 8px; }
.time-slot-row :deep(.field-input) { flex: 1; }
.time-slot-sep { color: var(--text-light, #9AA0BD); font-size: 12px; flex-shrink: 0; }
.slot-remove-btn { width: 32px; height: 32px; border: 0; border-radius: 8px; background: var(--page-bg, #F6F7FB); color: var(--text-light, #9AA0BD); cursor: pointer; font-size: 16px; flex-shrink: 0; }
.slot-remove-btn:hover:not(:disabled) { background: var(--danger-bg, #FBF0F0); color: var(--danger-text, #D45D5D); }
.slot-remove-btn:disabled { opacity: .35; cursor: not-allowed; }
.slot-add-btn { width: 100%; height: 36px; border-radius: 8px; border: 1px dashed var(--card-border, #E8EAF2); background: transparent; color: var(--brand-indigo, #5B52E3); font-family: var(--font-ui); font-size: 12px; font-weight: 600; cursor: pointer; }
.slot-add-btn:hover:not(:disabled) { background: var(--brand-light, #F0F2FE); }
.slot-add-btn:disabled { opacity: .35; cursor: not-allowed; }

/* ── Attachments ──────────────────────────────────────────────── */
.file-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; pointer-events: none; }
.file-select-btn { display: inline-flex; align-items: center; gap: 6px; width: fit-content; height: 40px; padding: 0 14px; border-radius: 9px; border: 1px dashed var(--card-border, #E8EAF2); background: var(--page-bg, #F6F7FB); color: var(--brand-indigo, #5B52E3); font-family: var(--font-ui); font-size: 12px; font-weight: 600; cursor: pointer; }
.file-select-btn:hover { border-color: var(--brand-indigo, #5B52E3); background: var(--brand-light, #F0F2FE); }
.attachment-list { display: flex; flex-direction: column; gap: 4px; list-style: none; margin: 0; padding: 0; }
.attachment-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: var(--page-bg, #F6F7FB); border: 1px solid var(--card-border, #E8EAF2); }
.attachment-name { flex: 1; font-size: 12px; color: var(--text-body, #1B2031); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.attachment-error { font-size: 11px; color: var(--danger-text, #D45D5D); }
.attachment-remove { flex-shrink: 0; background: transparent; border: 0; color: var(--text-light, #9AA0BD); cursor: pointer; font-size: 14px; }
.attachment-remove:hover { color: var(--danger-text, #D45D5D); }

/* ── Actions ──────────────────────────────────────────────────── */
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.btn { height: 44px; min-width: 100px; padding: 0 22px; border-radius: 10px; font-family: var(--font-ui); font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all .12s; }
.btn--primary { border: 0; background: var(--brand-indigo, #5B52E3); color: #fff; }
.btn--primary:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.btn--secondary { background: var(--card-bg, #fff); color: var(--text-secondary, #6B7191); border: 1px solid var(--card-border, #E8EAF2); }
.btn--secondary:hover:not(:disabled) { background: var(--page-bg, #F6F7FB); }
.btn:disabled { opacity: .5; cursor: not-allowed; }

.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .65s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width:560px) { .modal-content { width: calc(100vw - 32px); } .modal-form { padding: 16px; } .modal-actions { flex-direction: column-reverse; } .btn { width: 100%; } }
</style>
