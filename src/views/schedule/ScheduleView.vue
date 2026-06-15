<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { scheduleService } from '@/services/scheduleService'
import { workspaceService } from '@/services/workspaceService'
import AppLayout from '@/layouts/AppLayout.vue'
import type {
  MeetingSummaryResponse,
  ConfirmedScheduleResponse,
  MeetingDetailResponse,
  WorkspaceMemberResponse,
  CreatedMeetingPayload,
  MeetingReferenceRequest,
  TimeSlot,
} from '@/api/scheduleApi'
import MeetingCalendar from '@/components/domain/schedule/MeetingCalendar.vue'
import MeetingList from '@/components/domain/schedule/MeetingList.vue'
import MeetingCreateModal from '@/components/domain/schedule/MeetingCreateModal.vue'
import MeetingResponseModal from '@/components/domain/schedule/MeetingResponseModal.vue'
import MeetingDetailModal from '@/components/domain/schedule/MeetingDetailModal.vue'

// ─── 데이터 상태 ────────────────────────────────────────────────────────────
const meetings = ref<MeetingSummaryResponse[]>([])
const confirmedSchedules = ref<ConfirmedScheduleResponse[]>([])

const isLoadingMeetings = ref(true)
const isLoadingSchedules = ref(true)
const meetingsError = ref('')
const schedulesError = ref('')

// ─── 회의 생성 모달 상태 ─────────────────────────────────────────────────────
const createModalOpen = ref(false)
const memberSearchResults = ref<WorkspaceMemberResponse[]>([])
const isCreatingMeeting = ref(false)
const createMeetingError = ref('')

// ─── 가능 시간 응답 모달 상태 ────────────────────────────────────────────────
const responseModalOpen = ref(false)
const responseModalMeetingId = ref('')
const isSubmittingResponse = ref(false)
const submitResponseError = ref('')

// ─── 회의 상세 모달 상태 ─────────────────────────────────────────────────────
const detailModalOpen = ref(false)
const selectedMeetingDetail = ref<MeetingDetailResponse | null>(null)
const isLoadingDetail = ref(false)
const detailLoadError = ref('')

// ─── 회의 첨부파일 상태 ──────────────────────────────────────────────────────
const isAddingReference = ref(false)
const addReferenceError = ref('')
const deletingReferenceId = ref<string | null>(null)
const deleteReferenceError = ref('')

// ─── 이번 달 범위 계산 ───────────────────────────────────────────────────────
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) }
}

// ─── 확정 일정 새로고침 ─────────────────────────────────────────────────────
async function refreshConfirmedSchedules(): Promise<void> {
  const { startDate, endDate } = getCurrentMonthRange()

  try {
    confirmedSchedules.value = await scheduleService.fetchConfirmedSchedules(startDate, endDate)
  } catch (e: unknown) {
    schedulesError.value = e instanceof Error ? e.message : '확정 일정을 불러오지 못했습니다.'
  }
}

// ─── 마운트 시 데이터 로드 ──────────────────────────────────────────────────
onMounted(async () => {
  const { startDate, endDate } = getCurrentMonthRange()

  const [meetingsResult, schedulesResult] = await Promise.allSettled([
    scheduleService.fetchMeetings(),
    scheduleService.fetchConfirmedSchedules(startDate, endDate),
  ])

  if (meetingsResult.status === 'fulfilled') {
    meetings.value = meetingsResult.value
  } else {
    meetingsError.value =
      meetingsResult.reason instanceof Error ? meetingsResult.reason.message : '회의 목록을 불러오지 못했습니다.'
  }
  isLoadingMeetings.value = false

  if (schedulesResult.status === 'fulfilled') {
    confirmedSchedules.value = schedulesResult.value
  } else {
    schedulesError.value =
      schedulesResult.reason instanceof Error ? schedulesResult.reason.message : '확정 일정을 불러오지 못했습니다.'
  }
  isLoadingSchedules.value = false
})

// ─── 이벤트 핸들러 ───────────────────────────────────────────────────────────
function handleSelectMeeting(meetingId: string): void {
  openMeetingDetail(meetingId)
}

function handleOpenResponse(meetingId: string): void {
  responseModalMeetingId.value = meetingId
  submitResponseError.value = ''
  responseModalOpen.value = true
}

function handleCalendarSelectMeeting(meetingId: string): void {
  openMeetingDetail(meetingId)
}

async function handleSearchMembers(keyword: string): Promise<void> {
  memberSearchResults.value = await workspaceService.searchMembers(keyword)
}

// ─── 회의 상세 ──────────────────────────────────────────────────────────────
async function openMeetingDetail(meetingId: string): Promise<void> {
  detailModalOpen.value = true
  selectedMeetingDetail.value = null
  detailLoadError.value = ''
  isLoadingDetail.value = true
  addReferenceError.value = ''
  deleteReferenceError.value = ''

  try {
    selectedMeetingDetail.value = await scheduleService.fetchMeetingDetail(meetingId)
  } catch (e: unknown) {
    detailLoadError.value = e instanceof Error ? e.message : '회의 상세 정보를 불러오지 못했습니다.'
  } finally {
    isLoadingDetail.value = false
  }
}

function handleDetailOpenResponse(meetingId: string): void {
  detailModalOpen.value = false
  handleOpenResponse(meetingId)
}

// ─── 회의 생성 ──────────────────────────────────────────────────────────────
async function handleMeetingCreated(payload: CreatedMeetingPayload): Promise<void> {
  createMeetingError.value = ''
  isCreatingMeeting.value = true

  try {
    const { meetingId } = await scheduleService.createMeeting({
      title: payload.title,
      durationMinutes: payload.durationMinutes,
      participantEmployeeIds: payload.participantEmployeeIds,
      purpose: payload.purpose,
      agenda: payload.agenda,
      location: payload.location,
      references: payload.references,
    })

    await scheduleService.submitAvailableTimes(meetingId, {
      availableTimes: payload.availableTimes,
    })

    createModalOpen.value = false

    try {
      meetings.value = await scheduleService.fetchMeetings()
    } catch (e: unknown) {
      meetingsError.value = e instanceof Error ? e.message : '회의 목록을 불러오지 못했습니다.'
    }
  } catch (e: unknown) {
    createMeetingError.value = e instanceof Error ? e.message : '회의 생성에 실패했습니다.'
  } finally {
    isCreatingMeeting.value = false
  }
}

// ─── 회의 첨부파일 ────────────────────────────────────────────────────────
async function handleAddReference(payload: MeetingReferenceRequest): Promise<void> {
  if (!selectedMeetingDetail.value) return

  addReferenceError.value = ''
  isAddingReference.value = true

  try {
    const reference = await scheduleService.addMeetingReference(
      selectedMeetingDetail.value.meetingId,
      payload,
    )
    selectedMeetingDetail.value.references.push(reference)
  } catch (e: unknown) {
    addReferenceError.value = e instanceof Error ? e.message : '첨부파일 추가에 실패했습니다.'
  } finally {
    isAddingReference.value = false
  }
}

async function handleDeleteReference(referenceId: string): Promise<void> {
  if (!selectedMeetingDetail.value) return

  deleteReferenceError.value = ''
  deletingReferenceId.value = referenceId

  try {
    await scheduleService.deleteMeetingReference(selectedMeetingDetail.value.meetingId, referenceId)
    selectedMeetingDetail.value.references = selectedMeetingDetail.value.references.filter(
      (reference) => reference.id !== referenceId,
    )
  } catch (e: unknown) {
    deleteReferenceError.value = e instanceof Error ? e.message : '첨부파일 삭제에 실패했습니다.'
  } finally {
    deletingReferenceId.value = null
  }
}

// ─── 가능 시간 응답 제출 ─────────────────────────────────────────────────────
async function handleSubmitAvailableTimes(times: TimeSlot[]): Promise<void> {
  submitResponseError.value = ''
  isSubmittingResponse.value = true

  try {
    await scheduleService.submitAvailableTimes(responseModalMeetingId.value, { availableTimes: times })

    responseModalOpen.value = false

    try {
      meetings.value = await scheduleService.fetchMeetings()
    } catch (e: unknown) {
      meetingsError.value = e instanceof Error ? e.message : '회의 목록을 불러오지 못했습니다.'
    }

    await refreshConfirmedSchedules()
  } catch (e: unknown) {
    submitResponseError.value = e instanceof Error ? e.message : '가능 시간 제출에 실패했습니다.'
  } finally {
    isSubmittingResponse.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="schedule-view">
    <!-- ── Header ───────────────────────────────────────────────── -->
    <header class="schedule-header">
      <h1 class="schedule-title">회의 일정</h1>
      <button type="button" class="create-btn" @click="createModalOpen = true">+ 회의 생성</button>
    </header>

    <!-- ── Body ─────────────────────────────────────────────────── -->
    <div class="schedule-body">
      <section class="schedule-panel schedule-panel--calendar">
        <div v-if="isLoadingSchedules" class="panel-loading">
          <span class="spinner" />
          <p>확정 일정을 불러오는 중...</p>
        </div>
        <p v-else-if="schedulesError" class="panel-error">{{ schedulesError }}</p>
        <MeetingCalendar
          v-else
          :confirmed-schedules="confirmedSchedules"
          @select-meeting="handleCalendarSelectMeeting"
        />
      </section>

      <section class="schedule-panel schedule-panel--list">
        <div v-if="isLoadingMeetings" class="panel-loading">
          <span class="spinner" />
          <p>회의 목록을 불러오는 중...</p>
        </div>
        <p v-else-if="meetingsError" class="panel-error">{{ meetingsError }}</p>
        <MeetingList
          v-else
          :meetings="meetings"
          @select-meeting="handleSelectMeeting"
          @open-response="handleOpenResponse"
        />
      </section>
    </div>

    <!-- ── Footer ───────────────────────────────────────────────── -->
    <footer class="schedule-footer" />

    <!-- ── 회의 생성 모달 ───────────────────────────────────────────── -->
    <MeetingCreateModal
      :is-open="createModalOpen"
      :member-search-results="memberSearchResults"
      :is-submitting="isCreatingMeeting"
      :submit-error="createMeetingError"
      @close="createModalOpen = false"
      @search-members="handleSearchMembers"
      @created="handleMeetingCreated"
    />

    <!-- ── 가능 시간 응답 모달 ──────────────────────────────────────── -->
    <MeetingResponseModal
      :is-open="responseModalOpen"
      :meeting-id="responseModalMeetingId"
      :is-submitting="isSubmittingResponse"
      :submit-error="submitResponseError"
      @close="responseModalOpen = false"
      @submit="handleSubmitAvailableTimes"
    />

    <!-- ── 회의 상세 모달 ───────────────────────────────────────────── -->
    <MeetingDetailModal
      :is-open="detailModalOpen"
      :meeting="selectedMeetingDetail"
      :is-loading="isLoadingDetail"
      :load-error="detailLoadError"
      :is-adding-reference="isAddingReference"
      :add-reference-error="addReferenceError"
      :deleting-reference-id="deletingReferenceId"
      :delete-reference-error="deleteReferenceError"
      @close="detailModalOpen = false"
      @open-response="handleDetailOpenResponse"
      @add-reference="handleAddReference"
      @delete-reference="handleDeleteReference"
    />
    </div>
  </AppLayout>
</template>

<style scoped>
.schedule-view {
  min-height: 100vh;
  background: #0d0d12;
  padding: 48px 24px 80px;
  font-family: 'Inter', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── 헤더 ──────────────────────────────────────────────────────────── */
.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.schedule-title {
  font-size: 22px;
  font-weight: 700;
  color: #f0eeff;
  margin: 0;
  letter-spacing: -0.3px;
}

.create-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 6px 20px rgba(164, 147, 232, 0.28);
  transition: opacity 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
}
.create-btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(164, 147, 232, 0.38);
}

/* ── 본문 (캘린더 위 + 목록 아래, 화면 크기와 무관하게 고정) ────────────── */
.schedule-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.schedule-panel {
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(164, 147, 232, 0.15);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 24px;
  box-shadow:
    0 0 0 1px rgba(164, 147, 232, 0.07),
    0 24px 64px rgba(0, 0, 0, 0.45);
}

/* ── 로드/에러 상태 ─────────────────────────────────────────────────── */
.panel-loading,
.panel-error {
  text-align: center;
  padding: 48px 20px;
  font-size: 13px;
  color: rgba(164, 147, 232, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.panel-error {
  color: #f56565;
}

.spinner {
  display: inline-block;
  width: 28px;
  height: 28px;
  border: 2px solid rgba(164, 147, 232, 0.25);
  border-top-color: #a493e8;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── 푸터 ──────────────────────────────────────────────────────────── */
.schedule-footer {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  min-height: 40px;
}

</style>
