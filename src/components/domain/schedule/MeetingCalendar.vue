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

// ─── 셀 표시 항목 (시작 시간 배지 + 초과분 "외 N건") ──────────────────────────

const MAX_VISIBLE_MEETINGS = 2

type CellDisplayItem =
  | { type: 'time'; schedule: ConfirmedScheduleResponse }
  | { type: 'more'; count: number }

function getDisplayItemsForCell(cell: CalendarCell): CellDisplayItem[] {
  const schedules = getSchedulesForCell(cell)

  if (schedules.length <= MAX_VISIBLE_MEETINGS) {
    return schedules.map((schedule) => ({ type: 'time', schedule }))
  }

  const visible = schedules.slice(0, MAX_VISIBLE_MEETINGS - 1)
  const remaining = schedules.length - visible.length

  return [
    ...visible.map((schedule): CellDisplayItem => ({ type: 'time', schedule })),
    { type: 'more', count: remaining },
  ]
}

function formatStartTime(schedule: ConfirmedScheduleResponse): string {
  const start = new Date(schedule.confirmedStartTime)
  return start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
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
          <template v-for="item in getDisplayItemsForCell(cell)" :key="item.type === 'time' ? item.schedule.meetingId : 'more'">
            <button
              v-if="item.type === 'time'"
              type="button"
              class="meeting-tag"
              :title="item.schedule.title"
              @click="handleSelectMeeting(item.schedule.meetingId)"
            >
              {{ formatStartTime(item.schedule) }}
            </button>
            <span v-else class="meeting-tag meeting-tag--more">외 {{ item.count }}건</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══ Calendar — Light Dashboard Unified ══ */
.meeting-calendar { width: 100%; }

/* ── Header ──────────────────────────────────────────────────── */
.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.calendar-title { font-size: 22px; font-weight: 800; color: var(--text-body, #1B2031); margin: 0; }
.calendar-nav { display: flex; gap: 8px; }
.nav-btn {
  height: 36px; padding: 0 14px; border-radius: 10px;
  font-family: var(--font-ui); font-size: 13px; font-weight: 600; cursor: pointer;
  border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff); color: var(--text-secondary, #6B7191);
  transition: all .12s;
}
.nav-btn:hover:not(:disabled) { border-color: var(--brand-indigo, #5B52E3); color: var(--brand-indigo, #5B52E3); background: var(--brand-light, #F0F2FE); }
.nav-btn--today { color: var(--brand-indigo, #5B52E3); border-color: rgba(91,82,227,.2); font-weight: 700; }
.nav-btn--today:hover:not(:disabled) { background: var(--brand-indigo, #5B52E3); color: #fff; border-color: var(--brand-indigo, #5B52E3); }
.nav-btn:disabled { opacity: .4; cursor: not-allowed; }

/* ── Grid ────────────────────────────────────────────────────── */
.calendar-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
  border: 1px solid var(--card-border, #E8EAF2);
  border-radius: 12px; overflow: hidden;
}
.weekday-cell {
  padding: 12px 0; text-align: center;
  font-size: 13px; font-weight: 700; letter-spacing: .3px;
  color: var(--text-secondary, #6B7191);
  background: var(--page-bg, #F6F7FB);
  border-bottom: 1px solid var(--card-border, #E8EAF2);
}
.weekday-cell:nth-child(7n+1) { color: #E8526B; }
.weekday-cell:nth-child(7n) { color: var(--brand-indigo, #5B52E3); }

/* ── Day Cells ────────────────────────────────────────────────── */
.day-cell {
  min-height: 96px; padding: 8px 10px;
  border-right: 1px solid var(--card-border, #E8EAF2);
  border-bottom: 1px solid var(--card-border, #E8EAF2);
  display: flex; flex-direction: column; gap: 4px; overflow: hidden;
  transition: background .1s;
}
.day-cell:hover { background: var(--brand-light, #F0F2FE); }
.calendar-grid > .day-cell:nth-child(7n) { border-right: none; }
.day-cell--muted { background: rgba(246,247,251,.5); }
.day-cell--muted:hover { background: #f0f1f6; }

.day-number {
  font-size: 14px; font-weight: 600;
  color: var(--text-body, #1B2031); line-height: 1;
}
.day-cell--muted .day-number { color: var(--text-light, #9AA0BD); }
.day-cell--today { background: rgba(91,82,227,.04); }
.day-cell--today .day-number {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--brand-indigo, #5B52E3); color: #fff;
  font-weight: 800;
}

/* ── Meeting Tags ──────────────────────────────────────────────── */
.meeting-tags { display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
.meeting-tag {
  display: block; width: 100%; padding: 3px 7px; border: 0;
  border-radius: 6px; font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  background: var(--brand-light, #F0F2FE); color: var(--brand-chip-text, #4960CD);
  text-align: left; cursor: pointer; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; transition: all .12s;
}
.meeting-tag:hover:not(.meeting-tag--more) { background: var(--brand-indigo, #5B52E3); color: #fff; }
.meeting-tag--more { background: transparent; color: var(--text-light, #9AA0BD); cursor: default; text-align: center; font-weight: 700; }

@media (max-width:560px) { .day-cell { min-height: 64px; } .meeting-tag { font-size: 9px; } }
</style>
