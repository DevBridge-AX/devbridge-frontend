<script setup lang="ts">
import type { MeetingSummaryResponse, MeetingStatus } from '@/api/scheduleApi'

// ─── Props / Emits ─────────────────────────────────────────────────────────

const props = defineProps<{
  meetings: MeetingSummaryResponse[]
  currentEmployeeId?: string
}>()

const emit = defineEmits<{
  'select-meeting': [meetingId: string]
  'open-response': [meetingId: string]
}>()

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

// ─── 일시 포맷 ──────────────────────────────────────────────────────────────

function formatSchedule(meeting: MeetingSummaryResponse): string {
  if (!meeting.confirmedStartTime || !meeting.confirmedEndTime) {
    return '조율 중'
  }

  const start = new Date(meeting.confirmedStartTime)
  const end = new Date(meeting.confirmedEndTime)

  const month = String(start.getMonth() + 1).padStart(2, '0')
  const day = String(start.getDate()).padStart(2, '0')
  const meridiem = start.getHours() < 12 ? '오전' : '오후'
  const startTime = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const endTime = end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

  return `${month}/${day} (${meridiem}) ${startTime} ~ ${endTime}`
}

// ─── 이벤트 핸들러 ──────────────────────────────────────────────────────────

function handleSelect(meetingId: string): void {
  emit('select-meeting', meetingId)
}

function handleOpenResponse(meetingId: string): void {
  emit('open-response', meetingId)
}
</script>

<template>
  <div class="meeting-list">
    <table v-if="meetings.length > 0" class="meeting-table">
      <thead>
        <tr>
          <th class="col-schedule">일시</th>
          <th>회의명</th>
          <th>상태</th>
          <th class="col-action">액션</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="meeting in meetings" :key="meeting.meetingId">
          <td class="col-schedule">{{ formatSchedule(meeting) }}</td>
          <td class="col-title">{{ meeting.title }}</td>
          <td>
            <span class="status-badge" :class="STATUS_BADGE_CLASSES[meeting.status]">
              {{ STATUS_LABELS[meeting.status] }}
            </span>
          </td>
          <td class="col-action">
            <div class="action-buttons">
              <button type="button" class="btn btn--detail" @click="handleSelect(meeting.meetingId)">
                상세
              </button>
              <button
                v-if="meeting.status === 'GATHERING' && (!props.currentEmployeeId || meeting.hostEmployeeId !== props.currentEmployeeId)"
                type="button"
                class="btn btn--respond"
                @click="handleOpenResponse(meeting.meetingId)"
              >
                응답
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty-state">예정된 회의가 없습니다.</div>
  </div>
</template>

<style scoped>
.meeting-list {
  width: 100%;
}

.meeting-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: var(--text-body, #1B2031);
}

.meeting-table th {
  text-align: left;
  padding: 12px 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary, #6B7191);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--card-border, #E8EAF2);
}

.meeting-table td {
  padding: 14px;
  border-bottom: 1px solid var(--card-border, #E8EAF2);
  vertical-align: middle;
}

.meeting-table tbody tr:last-child td {
  border-bottom: none;
}

.meeting-table tbody tr:hover {
  background: var(--page-bg, #F6F7FB);
}

.col-title {
  font-weight: 600;
  white-space: normal;
  word-break: break-word;
}

.col-schedule {
  width: 150px;
  color: var(--text-light, #9AA0BD);
  white-space: nowrap;
}

.col-action {
  text-align: center;
  width: 140px;
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
}

.status-badge--gathering {
  color: #b45309;
  background: #fef9c3;
}

.status-badge--selecting {
  color: #c2410c;
  background: #ffedd5;
}

.status-badge--confirmed {
  color: #1d4ed8;
  background: #dbeafe;
}

.status-badge--canceled {
  color: var(--text-light, #9AA0BD);
  background: var(--page-bg, #F6F7FB);
}

/* ── 액션 버튼 ──────────────────────────────────────────────────────── */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.15s;
}

.btn--detail {
  background: var(--page-bg, #F6F7FB);
  border: 1px solid var(--card-border, #E8EAF2);
  color: var(--text-secondary, #6B7191);
}

.btn--detail:hover {
  border-color: var(--brand-indigo, #5B52E3);
  color: var(--brand-indigo, #5B52E3);
  background: var(--brand-light, #F0F2FE);
}

.btn--respond {
  background: var(--brand-light, #F0F2FE);
  border: 1px solid transparent;
  color: var(--brand-indigo, #5B52E3);
}

.btn--respond:hover {
  background: var(--brand-indigo, #5B52E3);
  color: #fff;
}

/* ── 빈 상태 ───────────────────────────────────────────────────────── */
.empty-state {
  padding: 48px 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary, #6B7191);
}
</style>
