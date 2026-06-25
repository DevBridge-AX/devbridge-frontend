<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TimeSlot } from '@/api/scheduleApi'

// ─── Props / Emits ─────────────────────────────────────────────────────────

const props = defineProps<{
  isOpen: boolean
  meetingId: string
  isSubmitting?: boolean
  submitError?: string
}>()

const emit = defineEmits<{
  close: []
  submit: [times: TimeSlot[]]
}>()

// ─── 상수 ──────────────────────────────────────────────────────────────────

const MAX_SLOTS = 3
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const TIME_SLOTS = (() => {
  const slots: string[] = []
  for (let hour = 9; hour < 18; hour += 1) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
    slots.push(`${String(hour).padStart(2, '0')}:30`)
  }
  return slots
})()

// ─── 날짜 유틸 ─────────────────────────────────────────────────────────────

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getSlotEndTime(time: string): string {
  const hour = Number(time.slice(0, 2))
  const minute = Number(time.slice(3, 5))
  const totalMinutes = hour * 60 + minute + 30
  const endHour = Math.floor(totalMinutes / 60)
  const endMinute = totalMinutes % 60
  return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
}

function formatSelectedDateLabel(dateKey: string): string {
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(5, 7))
  const day = Number(dateKey.slice(8, 10))
  const date = new Date(year, month - 1, day)
  return `${year}년 ${month}월 ${day}일 (${WEEKDAY_LABELS[date.getDay()] ?? ''})`
}

const today = new Date()
const todayKey = formatDateKey(today)

// ─── 표시 중인 연/월 상태 ───────────────────────────────────────────────────

const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth()) // 0-indexed

const calendarTitle = computed(() => `${viewYear.value}년 ${viewMonth.value + 1}월`)

const isViewingCurrentMonth = computed(
  () => viewYear.value === today.getFullYear() && viewMonth.value === today.getMonth(),
)

// ─── 캘린더 셀 계산 ─────────────────────────────────────────────────────────

interface CalendarCell {
  date: Date
  dateKey: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
}

const calendarCells = computed<CalendarCell[]>(() => {
  const firstOfMonth = new Date(viewYear.value, viewMonth.value, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7

  const cells: CalendarCell[] = []
  for (let i = 0; i < totalCells; i += 1) {
    const date = new Date(viewYear.value, viewMonth.value, 1 - startWeekday + i)
    const dateKey = formatDateKey(date)
    cells.push({
      date,
      dateKey,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === viewMonth.value,
      isToday: dateKey === todayKey,
    })
  }
  return cells
})

// ─── 네비게이션 ─────────────────────────────────────────────────────────────

function goToPreviousMonth(): void {
  if (viewMonth.value === 0) {
    viewYear.value -= 1
    viewMonth.value = 11
  } else {
    viewMonth.value -= 1
  }
}

function goToNextMonth(): void {
  if (viewMonth.value === 11) {
    viewYear.value += 1
    viewMonth.value = 0
  } else {
    viewMonth.value += 1
  }
}

function goToToday(): void {
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
}

// ─── 날짜 / 시간 슬롯 선택 ──────────────────────────────────────────────────

interface SelectedSlot {
  dateKey: string
  time: string
}

const selectedDateKey = ref<string | null>(null)
const selectedSlots = ref<SelectedSlot[]>([])
const limitMessage = ref('')

function selectDate(dateKey: string): void {
  selectedDateKey.value = dateKey
}

function hasSelection(dateKey: string): boolean {
  return selectedSlots.value.some((s) => s.dateKey === dateKey)
}

function isSlotSelected(time: string): boolean {
  if (!selectedDateKey.value) return false
  const dateKey = selectedDateKey.value
  return selectedSlots.value.some((s) => s.dateKey === dateKey && s.time === time)
}

function toggleSlot(time: string): void {
  if (!selectedDateKey.value) return
  const dateKey = selectedDateKey.value

  const index = selectedSlots.value.findIndex((s) => s.dateKey === dateKey && s.time === time)
  if (index !== -1) {
    selectedSlots.value.splice(index, 1)
    limitMessage.value = ''
    return
  }

  if (selectedSlots.value.length >= MAX_SLOTS) {
    limitMessage.value = `가능 시간은 최대 ${MAX_SLOTS}개까지 선택할 수 있습니다.`
    return
  }

  selectedSlots.value.push({ dateKey, time })
  limitMessage.value = ''
}

// ─── 모달 열릴 때 상태 초기화 ────────────────────────────────────────────────

function resetState(): void {
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
  selectedDateKey.value = null
  selectedSlots.value = []
  limitMessage.value = ''
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      resetState()
    }
  },
)

// ─── 제출 / 닫기 ────────────────────────────────────────────────────────────

function handleSubmit(): void {
  if (selectedSlots.value.length === 0) return

  const times: TimeSlot[] = selectedSlots.value.map((s) => ({
    startTime: `${s.dateKey}T${s.time}:00`,
    endTime: `${s.dateKey}T${getSlotEndTime(s.time)}:00`,
  }))

  emit('submit', times)
}

function handleClose(): void {
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">가능 시간 선택</h3>
        <button class="modal-close-btn" type="button" @click="handleClose">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="response-body">
        <!-- ── 캘린더 (날짜 선택) ───────────────────────────────────── -->
        <div class="response-calendar">
          <div class="calendar-header">
            <h4 class="calendar-title">{{ calendarTitle }}</h4>
            <div class="calendar-nav">
              <button type="button" class="nav-btn" @click="goToPreviousMonth">이전</button>
              <button
                type="button"
                class="nav-btn nav-btn--today"
                :disabled="isViewingCurrentMonth"
                @click="goToToday"
              >
                오늘
              </button>
              <button type="button" class="nav-btn" @click="goToNextMonth">다음</button>
            </div>
          </div>

          <div class="calendar-grid">
            <div v-for="label in WEEKDAY_LABELS" :key="label" class="weekday-cell">{{ label }}</div>

            <button
              v-for="cell in calendarCells"
              :key="cell.dateKey"
              type="button"
              class="day-cell"
              :class="{
                'day-cell--muted': !cell.isCurrentMonth,
                'day-cell--today': cell.isToday,
                'day-cell--selected': cell.dateKey === selectedDateKey,
              }"
              :disabled="!cell.isCurrentMonth"
              @click="selectDate(cell.dateKey)"
            >
              <span class="day-number">{{ cell.day }}</span>
              <span v-if="hasSelection(cell.dateKey)" class="day-dot" />
            </button>
          </div>
        </div>

        <!-- ── 시간 슬롯 패널 ───────────────────────────────────────── -->
        <div class="response-slots">
          <template v-if="selectedDateKey">
            <h4 class="slots-title">{{ formatSelectedDateLabel(selectedDateKey) }}</h4>
            <div class="slot-grid">
              <button
                v-for="time in TIME_SLOTS"
                :key="time"
                type="button"
                class="time-slot-btn"
                :class="{ 'time-slot-btn--selected': isSlotSelected(time) }"
                @click="toggleSlot(time)"
              >
                {{ time }}
              </button>
            </div>
          </template>
          <p v-else class="slots-placeholder">캘린더에서 날짜를 선택해 주세요.</p>

          <p class="selection-count">선택된 시간: {{ selectedSlots.length }} / {{ MAX_SLOTS }}</p>
          <p v-if="limitMessage" class="field-hint verify-error">{{ limitMessage }}</p>
          <p v-if="submitError" class="field-hint verify-error">{{ submitError }}</p>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" :disabled="isSubmitting" @click="handleClose">
          취소
        </button>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="isSubmitting || selectedSlots.length === 0"
          @click="handleSubmit"
        >
          <span v-if="isSubmitting" class="spinner" />
          제출
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── 모달 레이아웃 ───────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(15,18,32,.48); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; padding: 32px;
}
.modal-content {
  width: min(640px, calc(100vw - 48px)); max-height: calc(100vh - 64px);
  display: flex; flex-direction: column;
  background: var(--card-bg, #fff); border: 1px solid var(--card-border, #E8EAF2);
  border-radius: 20px; box-shadow: 0 24px 80px rgba(20,24,48,.18);
  overflow: hidden; padding: 24px 28px;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-title { font-size: 18px; font-weight: 700; color: var(--text-body, #1B2031); margin: 0; }
.modal-close-btn { width: 32px; height: 32px; border: 0; border-radius: 8px; background: var(--page-bg, #F6F7FB); color: var(--text-light, #9AA0BD); cursor: pointer; display: grid; place-items: center; }
.modal-close-btn:hover { background: var(--card-border, #E8EAF2); color: var(--text-body, #1B2031); }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

/* ── 본문 (캘린더 + 시간 슬롯) ────────────────────────────────────────── */
.response-body {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 20px;
}

/* ── 캘린더 ────────────────────────────────────────────────────────── */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.calendar-title {
  font-size: 14px;
  font-weight: 700;
  color: #f0eeff;
  margin: 0;
}
.calendar-nav {
  display: flex;
  gap: 8px;
}
.nav-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 238, 255, 0.7);
  font-family: inherit;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s;
}
.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #f0eeff;
}
.nav-btn--today {
  border-color: rgba(164, 147, 232, 0.2);
  color: #a493e8;
}
.nav-btn--today:hover:not(:disabled) {
  background: rgba(164, 147, 232, 0.2);
  border-color: #a493e8;
  color: #fff;
}
.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid rgba(164, 147, 232, 0.12);
  border-radius: 12px;
  overflow: hidden;
}
.weekday-cell {
  padding: 8px 0;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: rgba(164, 147, 232, 0.65);
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(164, 147, 232, 0.12);
}
.calendar-grid > *:nth-child(7n + 1) {
  color: #f56565;
}
.weekday-cell:nth-child(7n + 1) {
  color: #f56565;
}
.weekday-cell:nth-child(7n) {
  color: #6fa8f5;
}

.day-cell {
  height: 48px;
  padding: 6px;
  border: none;
  border-right: 1px solid rgba(164, 147, 232, 0.08);
  border-bottom: 1px solid rgba(164, 147, 232, 0.08);
  border-radius: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.2s;
}
.calendar-grid > .day-cell:nth-child(7n) {
  border-right: none;
}
.day-cell:hover:not(:disabled) {
  background: rgba(164, 147, 232, 0.1);
}
.day-cell:disabled {
  cursor: not-allowed;
}
.day-number {
  font-size: 12px;
  font-weight: 600;
  color: rgba(240, 238, 255, 0.75);
}
.day-cell--muted .day-number {
  color: rgba(240, 238, 255, 0.2);
}
.day-cell--today .day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(164, 147, 232, 0.35);
  color: #fff;
}
.day-cell--selected {
  background: rgba(164, 147, 232, 0.22);
}
.day-cell--selected .day-number {
  color: #fff;
}
.day-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a493e8;
}

/* ── 시간 슬롯 패널 ────────────────────────────────────────────────── */
.response-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.slots-title {
  font-size: 14px;
  font-weight: 700;
  color: #f0eeff;
  margin: 0;
}
.slots-placeholder {
  font-size: 13px;
  color: rgba(240, 238, 255, 0.45);
  margin: 0;
}
.slot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.time-slot-btn {
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(164, 147, 232, 0.2);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(240, 238, 255, 0.75);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}
.time-slot-btn:hover {
  border-color: #a493e8;
  background: rgba(164, 147, 232, 0.12);
}
.time-slot-btn--selected {
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  border-color: transparent;
  color: #fff;
}
.selection-count {
  font-size: 12px;
  color: rgba(240, 238, 255, 0.5);
  margin: 0;
}

/* ── 공통 필드 힌트 ────────────────────────────────────────────────── */
.field-hint {
  font-size: 11px;
  color: #f5a520;
  margin: 0;
  padding: 0 2px;
}
.verify-error {
  color: #f56565 !important;
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
@media (max-width: 640px) {
  .modal-content {
    padding: 20px 16px;
  }
  .response-body {
    grid-template-columns: 1fr;
  }
  .modal-actions {
    flex-direction: column-reverse;
  }
  .modal-actions .btn {
    width: 100%;
  }
}
</style>
