<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ConfirmedScheduleResponse } from '@/api/scheduleApi'

// ─── Props / Emits ─────────────────────────────────────────────────────────

const props = defineProps<{
  confirmedSchedules: ConfirmedScheduleResponse[]
}>()

const emit = defineEmits<{
  'select-meeting': [meetingId: string]
}>()

// ─── 상수 ──────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

// ─── 날짜 유틸 ─────────────────────────────────────────────────────────────

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

// ─── 날짜별 확정 일정 매핑 ──────────────────────────────────────────────────

const schedulesByDate = computed<Record<string, ConfirmedScheduleResponse[]>>(() => {
  const map: Record<string, ConfirmedScheduleResponse[]> = {}

  for (const schedule of props.confirmedSchedules) {
    const dateKey = schedule.confirmedStartTime.slice(0, 10)
    if (!map[dateKey]) {
      map[dateKey] = []
    }
    map[dateKey].push(schedule)
  }

  return map
})

function getSchedulesForCell(cell: CalendarCell): ConfirmedScheduleResponse[] {
  return schedulesByDate.value[cell.dateKey] ?? []
}

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

// ─── 이벤트 핸들러 ──────────────────────────────────────────────────────────

function handleSelectMeeting(meetingId: string): void {
  emit('select-meeting', meetingId)
}
</script>

<template>
  <div class="meeting-calendar">
    <div class="calendar-header">
      <h2 class="calendar-title">{{ calendarTitle }}</h2>
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

      <div
        v-for="cell in calendarCells"
        :key="cell.dateKey"
        class="day-cell"
        :class="{ 'day-cell--muted': !cell.isCurrentMonth, 'day-cell--today': cell.isToday }"
      >
        <span class="day-number">{{ cell.day }}</span>
        <div class="meeting-tags">
          <button
            v-for="schedule in getSchedulesForCell(cell)"
            :key="schedule.meetingId"
            type="button"
            class="meeting-tag"
            :title="schedule.title"
            @click="handleSelectMeeting(schedule.meetingId)"
          >
            {{ schedule.title }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meeting-calendar {
  width: 100%;
}

/* ── 헤더 ──────────────────────────────────────────────────────────── */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.calendar-title {
  font-size: 16px;
  font-weight: 700;
  color: #f0eeff;
  margin: 0;
}

.calendar-nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  height: 32px;
  padding: 0 14px;
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

/* ── 그리드 ────────────────────────────────────────────────────────── */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid rgba(164, 147, 232, 0.12);
  border-radius: 12px;
  overflow: hidden;
}

.weekday-cell {
  padding: 10px 0;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: rgba(164, 147, 232, 0.65);
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(164, 147, 232, 0.12);
}

/* 일요일(첫 컬럼) / 토요일(마지막 컬럼) 강조 */
.calendar-grid > *:nth-child(7n + 1) {
  color: #f56565;
}
.weekday-cell:nth-child(7n + 1) {
  color: #f56565;
}
.weekday-cell:nth-child(7n) {
  color: #6fa8f5;
}

/* ── 날짜 셀 ───────────────────────────────────────────────────────── */
.day-cell {
  min-height: 92px;
  padding: 6px;
  border-right: 1px solid rgba(164, 147, 232, 0.08);
  border-bottom: 1px solid rgba(164, 147, 232, 0.08);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.calendar-grid > .day-cell:nth-child(7n) {
  border-right: none;
}

.day-number {
  font-size: 12px;
  font-weight: 600;
  color: rgba(240, 238, 255, 0.75);
}

.day-cell--muted .day-number {
  color: rgba(240, 238, 255, 0.25);
}

.day-cell--today {
  background: rgba(164, 147, 232, 0.07);
}

.day-cell--today .day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #a493e8;
  color: #fff;
}

/* ── 회의 태그 ─────────────────────────────────────────────────────── */
.meeting-tags {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.meeting-tag {
  display: block;
  width: 100%;
  padding: 2px 6px;
  border: none;
  border-radius: 4px;
  background: rgba(164, 147, 232, 0.18);
  color: #c9bcf5;
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background-color 0.2s, color 0.2s;
}

.meeting-tag:hover {
  background: #a493e8;
  color: #fff;
}

/* ── 반응형 ────────────────────────────────────────────────────────── */
@media (max-width: 560px) {
  .day-cell {
    min-height: 64px;
  }
  .meeting-tag {
    font-size: 10px;
  }
}
</style>
