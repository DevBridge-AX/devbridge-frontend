<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CreatedMeetingPayload, WorkspaceMemberResponse } from '@/api/scheduleApi'
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
  max-width: 520px;
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
  transition: background-color 0.2s, color 0.2s;
}
.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f0eeff;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

/* ── 필드 ──────────────────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(240, 238, 255, 0.5);
  letter-spacing: 0.2px;
  text-transform: uppercase;
}
.field-input,
.field-textarea {
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(164, 147, 232, 0.2);
  background: rgba(255, 255, 255, 0.045);
  color: #f0eeff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
  font-family: inherit;
  width: 100%;
}
.field-input {
  height: 44px;
}
.field-textarea {
  padding: 10px 14px;
  resize: vertical;
  min-height: 72px;
}
.field-input::placeholder,
.field-textarea::placeholder {
  color: rgba(164, 147, 232, 0.3);
}
.field-input:focus,
.field-textarea:focus {
  border-color: #a493e8;
  background: rgba(164, 147, 232, 0.07);
  box-shadow: 0 0 0 3px rgba(164, 147, 232, 0.13);
}
.field-hint {
  font-size: 11px;
  color: #f5a520;
  margin: 0;
  padding: 0 2px;
}
.verify-error {
  color: #f56565 !important;
}

/* ── 참석자 칩 / 드롭다운 ──────────────────────────────────────────────── */
.participant-field {
  position: relative;
}
.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 12px;
  border-radius: 999px;
  background: rgba(164, 147, 232, 0.18);
  color: #c9bcf5;
  font-size: 12px;
  font-weight: 500;
}
.chip-remove {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chip-remove:hover {
  color: #fff;
}
.member-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 4px 0 0;
  padding: 6px;
  list-style: none;
  background: rgba(28, 28, 36, 0.98);
  border: 1px solid rgba(164, 147, 232, 0.2);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}
.member-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.member-option:hover {
  background: rgba(164, 147, 232, 0.15);
}
.member-name {
  font-size: 13px;
  font-weight: 600;
  color: #f0eeff;
}
.member-meta {
  font-size: 11px;
  color: rgba(240, 238, 255, 0.45);
}

/* ── 가능 시간 슬롯 ─────────────────────────────────────────────────── */
.time-slot-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.time-slot-row .dt-picker {
  flex: 1;
}
.time-slot-sep {
  color: rgba(240, 238, 255, 0.4);
  font-size: 13px;
  flex-shrink: 0;
}
.slot-remove-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 238, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}
.slot-remove-btn:hover:not(:disabled) {
  background: rgba(245, 101, 101, 0.15);
  color: #f56565;
}
.slot-remove-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.slot-add-btn {
  width: 100%;
  height: 36px;
  border-radius: 8px;
  border: 1px dashed rgba(164, 147, 232, 0.3);
  background: transparent;
  color: #a493e8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.2s, border-color 0.2s;
}
.slot-add-btn:hover:not(:disabled) {
  background: rgba(164, 147, 232, 0.1);
}
.slot-add-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ── 버튼 ──────────────────────────────────────────────────────────── */
.btn {
  height: 44px;
  padding: 0 24px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s, opacity 0.2s;
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
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--primary {
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(164, 147, 232, 0.25);
}
.btn--primary:hover:not(:disabled) {
  opacity: 0.95;
}
.btn--secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(240, 238, 255, 0.7);
}
.btn--secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #f0eeff;
}

/* ── 스피너 ────────────────────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 반응형 ────────────────────────────────────────────────────────── */
@media (max-width: 560px) {
  .modal-content {
    padding: 20px 16px;
  }
  .modal-actions {
    flex-direction: column-reverse;
  }
  .modal-actions .btn {
    width: 100%;
  }
}
</style>
