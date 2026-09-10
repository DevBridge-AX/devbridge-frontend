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

// ─── 날짜 / 시간 슬롯 선택 (범위 선택 방식) ─────────────────────────────────

interface TimeRange {
  dateKey: string
  startTime: string
  endTime: string
}

const selectedDateKey = ref<string | null>(null)
const selectedRanges = ref<TimeRange[]>([])
const rangeAnchor = ref<string | null>(null)
const limitMessage = ref('')

function selectDate(dateKey: string): void {
  selectedDateKey.value = dateKey
  rangeAnchor.value = null
}

function hasSelection(dateKey: string): boolean {
  return selectedRanges.value.some((r) => r.dateKey === dateKey)
}

function getSelectedTimesForDate(dateKey: string): Set<string> {
  const times = new Set<string>()
  for (const range of selectedRanges.value) {
    if (range.dateKey !== dateKey) continue
    const startIdx = TIME_SLOTS.indexOf(range.startTime)
    const endIdx = TIME_SLOTS.indexOf(range.endTime)
    if (startIdx === -1 || endIdx === -1) continue
    for (let i = startIdx; i <= endIdx; i++) {
      times.add(TIME_SLOTS[i]!)
    }
  }
  return times
}

function isSlotSelected(time: string): boolean {
  if (!selectedDateKey.value) return false
  return getSelectedTimesForDate(selectedDateKey.value).has(time)
}

function toggleSlot(time: string): void {
  if (!selectedDateKey.value) return
  const dateKey = selectedDateKey.value

  if (isSlotSelected(time)) {
    selectedRanges.value = selectedRanges.value.filter((r) => {
      if (r.dateKey !== dateKey) return true
      const startIdx = TIME_SLOTS.indexOf(r.startTime)
      const endIdx = TIME_SLOTS.indexOf(r.endTime)
      const clickIdx = TIME_SLOTS.indexOf(time)
      return clickIdx < startIdx || clickIdx > endIdx
    })
    rangeAnchor.value = null
    limitMessage.value = ''
    return
  }

  if (rangeAnchor.value === null) {
    rangeAnchor.value = time
    if (selectedRanges.value.length >= MAX_SLOTS) {
      limitMessage.value = `가능 시간 블록은 최대 ${MAX_SLOTS}개까지 선택할 수 있습니다.`
      rangeAnchor.value = null
      return
    }
    selectedRanges.value.push({ dateKey, startTime: time, endTime: time })
    limitMessage.value = ''
    return
  }

  const anchorIdx = TIME_SLOTS.indexOf(rangeAnchor.value)
  const clickIdx = TIME_SLOTS.indexOf(time)
  const startTime = TIME_SLOTS[Math.min(anchorIdx, clickIdx)]!
  const endTime = TIME_SLOTS[Math.max(anchorIdx, clickIdx)]!

  const lastRange = selectedRanges.value[selectedRanges.value.length - 1]
  if (lastRange && lastRange.dateKey === dateKey && lastRange.startTime === rangeAnchor.value && lastRange.endTime === rangeAnchor.value) {
    lastRange.startTime = startTime
    lastRange.endTime = endTime
  }

  rangeAnchor.value = null
  limitMessage.value = ''
}

const selectedBlockCount = computed(() => selectedRanges.value.length)

// ─── 모달 열릴 때 상태 초기화 ────────────────────────────────────────────────

function resetState(): void {
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
  selectedDateKey.value = null
  selectedRanges.value = []
  rangeAnchor.value = null
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
  if (selectedRanges.value.length === 0) return

  const times: TimeSlot[] = selectedRanges.value.map((r) => ({
    startTime: `${r.dateKey}T${r.startTime}:00`,
    endTime: `${r.dateKey}T${getSlotEndTime(r.endTime)}:00`,
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
                :class="{ 'time-slot-btn--selected': isSlotSelected(time), 'time-slot-btn--anchor': rangeAnchor === time }"
                @click="toggleSlot(time)"
              >
                {{ time }}
              </button>
            </div>
          </template>
          <p v-else class="slots-placeholder">캘린더에서 날짜를 선택해 주세요.</p>

          <p v-if="rangeAnchor" class="selection-hint">끝 시간을 클릭하면 범위가 선택됩니다.</p>
          <p class="selection-count">선택된 블록: {{ selectedBlockCount }} / {{ MAX_SLOTS }}</p>
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
          :disabled="isSubmitting || selectedRanges.length === 0"
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
  color: var(--text-body, #1B2031);
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
  border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff);
  color: var(--text-secondary, #6B7191);
  font-family: inherit;
  transition: all 0.15s;
}
.nav-btn:hover:not(:disabled) {
  border-color: var(--brand-indigo, #5B52E3);
  color: var(--brand-indigo, #5B52E3);
  background: var(--brand-light, #F0F2FE);
}
.nav-btn--today {
  border-color: var(--brand-indigo, #5B52E3);
  color: var(--brand-indigo, #5B52E3);
  font-weight: 700;
}
.nav-btn--today:hover:not(:disabled) {
  background: var(--brand-indigo, #5B52E3);
  color: #fff;
}
.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid var(--card-border, #E8EAF2);
  border-radius: 12px;
  overflow: hidden;
}
.weekday-cell {
  padding: 8px 0;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--text-secondary, #6B7191);
  background: var(--page-bg, #F6F7FB);
  border-bottom: 1px solid var(--card-border, #E8EAF2);
}
.calendar-grid > *:nth-child(7n + 1) {
  color: #dc2626;
}
.weekday-cell:nth-child(7n + 1) {
  color: #dc2626;
}
.weekday-cell:nth-child(7n) {
  color: #2563eb;
}

.day-cell {
  height: 48px;
  padding: 6px;
  border: none;
  border-right: 1px solid var(--card-border, #E8EAF2);
  border-bottom: 1px solid var(--card-border, #E8EAF2);
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
  background: var(--brand-light, #F0F2FE);
}
.day-cell:disabled {
  cursor: not-allowed;
}
.day-number {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-body, #1B2031);
}
.day-cell--muted .day-number {
  color: var(--text-light, #9AA0BD);
}
.day-cell--today .day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--brand-indigo, #5B52E3);
  color: #fff;
}
.day-cell--selected {
  background: var(--brand-light, #F0F2FE);
}
.day-cell--selected .day-number {
  color: var(--brand-indigo, #5B52E3);
  font-weight: 700;
}
.day-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand-indigo, #5B52E3);
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
  color: var(--text-body, #1B2031);
  margin: 0;
}
.slots-placeholder {
  font-size: 13px;
  color: var(--text-light, #9AA0BD);
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
  border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff);
  color: var(--text-body, #1B2031);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.time-slot-btn:hover {
  border-color: var(--brand-indigo, #5B52E3);
  background: var(--brand-light, #F0F2FE);
  color: var(--brand-indigo, #5B52E3);
}
.time-slot-btn--selected {
  background: var(--brand-indigo, #5B52E3);
  border-color: var(--brand-indigo, #5B52E3);
  color: #fff;
}
.time-slot-btn--anchor {
  background: var(--brand-light, #F0F2FE);
  border-color: var(--brand-indigo, #5B52E3);
  color: var(--brand-indigo, #5B52E3);
  box-shadow: 0 0 0 2px rgba(91, 82, 227, 0.2);
}
.selection-hint {
  font-size: 11px;
  font-weight: 600;
  color: var(--brand-indigo, #5B52E3);
  margin: 0;
}
.selection-count {
  font-size: 12px;
  color: var(--text-secondary, #6B7191);
  margin: 0;
}

/* ── 공통 필드 힌트 ────────────────────────────────────────────────── */
.field-hint {
  font-size: 11px;
  color: #d97706;
  margin: 0;
  padding: 0 2px;
}
.verify-error {
  color: var(--danger-text, #D45D5D) !important;
}

/* ── 버튼 ──────────────────────────────────────────────────────────── */
.btn {
  height: 44px;
  padding: 0 24px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
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
  background: var(--brand-indigo, #5B52E3);
  color: #fff;
}
.btn--primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
.btn--secondary {
  background: var(--page-bg, #F6F7FB);
  border: 1px solid var(--card-border, #E8EAF2);
  color: var(--text-secondary, #6B7191);
}
.btn--secondary:hover:not(:disabled) {
  border-color: var(--brand-indigo, #5B52E3);
  color: var(--brand-indigo, #5B52E3);
  background: var(--brand-light, #F0F2FE);
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
