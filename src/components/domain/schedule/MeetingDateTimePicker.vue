<script setup lang="ts">
import { ref, computed } from 'vue'

// ─── Props / Emits ─────────────────────────────────────────────────────────
// modelValue: ISO 8601 문자열 ("YYYY-MM-DDTHH:mm:ss"), 미선택 시 빈 문자열

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// ─── 상수 ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)
const MINUTE_OPTIONS = [0, 30]

// ─── 표시 라벨 ("YY.MM.DD HH:mm") ────────────────────────────────────────────

const displayLabel = computed(() => {
  const value = props.modelValue
  if (!value) return '날짜·시간 선택'

  const year = value.slice(2, 4)
  const month = value.slice(5, 7)
  const day = value.slice(8, 10)
  const hour = value.slice(11, 13)
  const minute = value.slice(14, 16)
  return `${year}.${month}.${day} ${hour}:${minute}`
})

// ─── 패널 상태 ──────────────────────────────────────────────────────────────

const isPanelOpen = ref(false)
const pendingMonth = ref(0) // 0-indexed
const pendingDay = ref(1)
const pendingHour = ref(9)
const pendingMinute = ref(0)

function openPanel(): void {
  const value = props.modelValue
  if (value) {
    pendingMonth.value = Number(value.slice(5, 7)) - 1
    pendingDay.value = Number(value.slice(8, 10))
    pendingHour.value = Number(value.slice(11, 13))
    pendingMinute.value = Number(value.slice(14, 16)) >= 30 ? 30 : 0
  } else {
    const now = new Date()
    pendingMonth.value = now.getMonth()
    pendingDay.value = now.getDate()
    pendingHour.value = 9
    pendingMinute.value = 0
  }
  isPanelOpen.value = true
}

function togglePanel(): void {
  if (isPanelOpen.value) {
    isPanelOpen.value = false
  } else {
    openPanel()
  }
}

// ─── 캘린더 (연도 고정, 월 단위 네비게이션) ─────────────────────────────────────

function getDaysInMonth(month: number): number {
  return new Date(CURRENT_YEAR, month + 1, 0).getDate()
}

interface CalendarCell {
  day: number
  isCurrentMonth: boolean
  isSelected: boolean
}

const calendarCells = computed<CalendarCell[]>(() => {
  const firstOfMonth = new Date(CURRENT_YEAR, pendingMonth.value, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = getDaysInMonth(pendingMonth.value)
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7

  const cells: CalendarCell[] = []
  for (let i = 0; i < totalCells; i += 1) {
    const dayOffset = i - startWeekday + 1
    const isCurrentMonth = dayOffset >= 1 && dayOffset <= daysInMonth
    const date = new Date(CURRENT_YEAR, pendingMonth.value, dayOffset)
    cells.push({
      day: date.getDate(),
      isCurrentMonth,
      isSelected: isCurrentMonth && dayOffset === pendingDay.value,
    })
  }
  return cells
})

function selectDay(cell: CalendarCell): void {
  if (!cell.isCurrentMonth) return
  pendingDay.value = cell.day
}

function goToPreviousMonth(): void {
  if (pendingMonth.value === 0) return
  pendingMonth.value -= 1
  pendingDay.value = Math.min(pendingDay.value, getDaysInMonth(pendingMonth.value))
}

function goToNextMonth(): void {
  if (pendingMonth.value === 11) return
  pendingMonth.value += 1
  pendingDay.value = Math.min(pendingDay.value, getDaysInMonth(pendingMonth.value))
}

// ─── 적용 ──────────────────────────────────────────────────────────────────

function applySelection(): void {
  const month = String(pendingMonth.value + 1).padStart(2, '0')
  const day = String(pendingDay.value).padStart(2, '0')
  const hour = String(pendingHour.value).padStart(2, '0')
  const minute = String(pendingMinute.value).padStart(2, '0')

  emit('update:modelValue', `${CURRENT_YEAR}-${month}-${day}T${hour}:${minute}:00`)
  isPanelOpen.value = false
}
</script>

<template>
  <div class="dt-picker">
    <button type="button" class="dt-trigger" @click="togglePanel">
      {{ displayLabel }}
    </button>

    <div v-if="isPanelOpen" class="dt-panel">
      <div class="dt-panel-header">
        <button type="button" class="dt-nav-btn" :disabled="pendingMonth === 0" @click="goToPreviousMonth">
          ‹
        </button>
        <span class="dt-panel-title">{{ CURRENT_YEAR }}년 {{ pendingMonth + 1 }}월</span>
        <button type="button" class="dt-nav-btn" :disabled="pendingMonth === 11" @click="goToNextMonth">
          ›
        </button>
      </div>

      <div class="dt-calendar-grid">
        <div v-for="label in WEEKDAY_LABELS" :key="label" class="dt-weekday-cell">{{ label }}</div>
        <button
          v-for="(cell, index) in calendarCells"
          :key="index"
          type="button"
          class="dt-day-cell"
          :class="{ 'dt-day-cell--muted': !cell.isCurrentMonth, 'dt-day-cell--selected': cell.isSelected }"
          :disabled="!cell.isCurrentMonth"
          @click="selectDay(cell)"
        >
          {{ cell.day }}
        </button>
      </div>

      <div class="dt-time-row">
        <select v-model.number="pendingHour" class="dt-time-select">
          <option v-for="h in HOUR_OPTIONS" :key="h" :value="h">{{ String(h).padStart(2, '0') }}</option>
        </select>
        <span class="dt-time-sep">:</span>
        <select v-model.number="pendingMinute" class="dt-time-select">
          <option v-for="m in MINUTE_OPTIONS" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
        </select>
      </div>

      <button type="button" class="dt-apply-btn" @click="applySelection">적용</button>
    </div>
  </div>
</template>

<style scoped>
/* ══ Date-Time Picker (Dashboard Unified) ══ */
.dt-picker { position: relative; width: 100%; }
.dt-trigger {
  width: 100%; height: 44px; padding: 0 12px; border-radius: 10px;
  border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff); color: var(--text-body, #1B2031);
  font-family: var(--font-ui); font-size: 13px; text-align: left; cursor: pointer;
  transition: border-color .15s;
}
.dt-trigger:hover { border-color: var(--brand-indigo, #5B52E3); }

.dt-panel {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20;
  padding: 14px; border-radius: 12px;
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #E8EAF2);
  box-shadow: var(--shadow-lg, 0 8px 28px rgba(27,32,49,.08));
  display: flex; flex-direction: column; gap: 10px;
}
.dt-panel-header { display: flex; justify-content: space-between; align-items: center; }
.dt-panel-title { font-size: 13px; font-weight: 700; color: var(--text-body, #1B2031); }
.dt-nav-btn {
  width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff); color: var(--text-secondary, #6B7191);
  font-size: 14px; cursor: pointer; display: grid; place-items: center;
}
.dt-nav-btn:hover:not(:disabled) { border-color: var(--brand-indigo, #5B52E3); color: var(--brand-indigo, #5B52E3); }
.dt-nav-btn:disabled { opacity: .3; cursor: not-allowed; }

.dt-calendar-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
.dt-weekday-cell { text-align: center; font-size: 10px; font-weight: 700; color: var(--text-light, #9AA0BD); padding: 4px 0; }
.dt-weekday-cell:nth-child(7n+1) { color: #E8526B; }
.dt-weekday-cell:nth-child(7n) { color: var(--brand-indigo, #5B52E3); }
.dt-day-cell {
  height: 32px; border: 0; border-radius: 8px;
  background: transparent; color: var(--text-body, #1B2031);
  font-family: var(--font-ui); font-size: 12px; font-weight: 600; cursor: pointer;
}
.dt-day-cell:hover:not(:disabled) { background: var(--brand-light, #F0F2FE); }
.dt-day-cell--muted { color: var(--text-light, #9AA0BD); cursor: not-allowed; }
.dt-day-cell--selected { background: var(--brand-indigo, #5B52E3); color: #fff; font-weight: 700; }

.dt-time-row { display: flex; align-items: center; justify-content: center; gap: 8px; }
.dt-time-select {
  flex: 1; height: 36px; padding: 0 8px; border-radius: 8px;
  border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff); color: var(--text-body, #1B2031);
  font-family: var(--font-ui); font-size: 13px; cursor: pointer;
}
.dt-time-sep { color: var(--text-light, #9AA0BD); font-size: 13px; }
.dt-apply-btn { height: 36px; border-radius: 8px; border: 0; background: var(--brand-indigo, #5B52E3); color: #fff; font-family: var(--font-ui); font-size: 12px; font-weight: 600; cursor: pointer; }
.dt-apply-btn:hover { opacity: .9; }
</style>
