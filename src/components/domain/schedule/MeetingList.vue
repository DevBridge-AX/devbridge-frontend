<script setup lang="ts">
import type { MeetingSummaryResponse, MeetingStatus } from '@/api/scheduleApi'

// ─── Props / Emits ─────────────────────────────────────────────────────────

defineProps<{
  meetings: MeetingSummaryResponse[]
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

  const datePart = start.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const startTime = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return `${datePart} ${startTime} ~ ${endTime}`
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
          <th>회의명</th>
          <th>회의 일시</th>
          <th>상태</th>
          <th class="col-action">액션</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="meeting in meetings" :key="meeting.meetingId">
          <td class="col-title">{{ meeting.title }}</td>
          <td class="col-schedule">{{ formatSchedule(meeting) }}</td>
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
                v-if="meeting.status === 'GATHERING'"
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
  color: #f0eeff;
}

.meeting-table th {
  text-align: left;
  padding: 12px 14px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(164, 147, 232, 0.65);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(164, 147, 232, 0.15);
}

.meeting-table td {
  padding: 14px;
  border-bottom: 1px solid rgba(164, 147, 232, 0.08);
  vertical-align: middle;
}

.meeting-table tbody tr:last-child td {
  border-bottom: none;
}

.col-title {
  font-weight: 600;
}

.col-schedule {
  color: rgba(240, 238, 255, 0.65);
  white-space: nowrap;
}

.col-action {
  text-align: right;
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

/* ── 액션 버튼 ──────────────────────────────────────────────────────── */
.action-buttons {
  display: flex;
  justify-content: flex-end;
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
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.btn--detail {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(240, 238, 255, 0.7);
}

.btn--detail:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f0eeff;
}

.btn--respond {
  background: rgba(164, 147, 232, 0.1);
  border: 1px solid rgba(164, 147, 232, 0.2);
  color: #a493e8;
}

.btn--respond:hover {
  background: rgba(164, 147, 232, 0.2);
  border-color: #a493e8;
  color: #fff;
}

/* ── 빈 상태 ───────────────────────────────────────────────────────── */
.empty-state {
  padding: 48px 20px;
  text-align: center;
  font-size: 13px;
  color: rgba(240, 238, 255, 0.5);
}
</style>
