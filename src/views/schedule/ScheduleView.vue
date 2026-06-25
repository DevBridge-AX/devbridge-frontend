<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { scheduleService } from '@/services/scheduleService'
import { workspaceService } from '@/services/workspaceService'
import { useAuthStore } from '@/state/authStore'
import AppLayout from '@/layouts/AppLayout.vue'
import type {
  MeetingSummaryResponse,
  ConfirmedScheduleResponse,
  MeetingDetailResponse,
  WorkspaceMemberResponse,
  CreatedMeetingPayload,
  MeetingReferenceRequest,
  UpdateMeetingRequest,
  TimeSlot,
} from '@/api/scheduleApi'
import MeetingCalendar from '@/components/domain/schedule/MeetingCalendar.vue'
import MeetingList from '@/components/domain/schedule/MeetingList.vue'
import MeetingCreateModal from '@/components/domain/schedule/MeetingCreateModal.vue'
import MeetingResponseModal from '@/components/domain/schedule/MeetingResponseModal.vue'
import MeetingDetailModal from '@/components/domain/schedule/MeetingDetailModal.vue'

const route = useRoute()
const router = useRouter()

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

// ─── 회의 정보 수정 상태 (Host 전용) ─────────────────────────────────────────
const authStore = useAuthStore()
const isUpdatingMeeting = ref(false)
const updateMeetingError = ref('')

const isHostOfSelectedMeeting = computed<boolean>(() => {
  const meeting = selectedMeetingDetail.value
  const employeeId = authStore.currentUser?.employeeId
  if (!meeting || !employeeId) return false
  return meeting.participants.some((p) => p.role === 'HOST' && p.employeeId === employeeId)
})

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

  handleQueryParams()
})

// ─── 워크스페이스 전환 시 데이터 재조회 ──────────────────────────────────────
watch(
  () => route.params.workspaceId,
  async (newId, oldId) => {
    if (!newId || newId === oldId) return

    meetingsError.value = ''
    schedulesError.value = ''
    isLoadingMeetings.value = true
    isLoadingSchedules.value = true

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

    handleQueryParams()
  },
)

// ─── 쿼리 파라미터 기반 모달 자동 오픈 ────────────────────────────────────────
function handleQueryParams() {
  const scheduleId = route.query.scheduleId as string | undefined
  const action = route.query.action as string | undefined
  if (!scheduleId) return

  if (action === 'respond') {
    handleOpenResponse(scheduleId)
  } else {
    openMeetingDetail(scheduleId)
  }

  router.replace({ query: {} })
}

watch(
  () => route.query.scheduleId,
  (val) => {
    if (val) handleQueryParams()
  },
)

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
  updateMeetingError.value = ''

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

// ─── 회의 정보 수정 ────────────────────────────────────────────────────────
async function handleUpdateMeeting(payload: UpdateMeetingRequest): Promise<void> {
  if (!selectedMeetingDetail.value) return

  updateMeetingError.value = ''
  isUpdatingMeeting.value = true

  try {
    const updated = await scheduleService.updateMeeting(selectedMeetingDetail.value.meetingId, payload)
    selectedMeetingDetail.value = updated

    const target = meetings.value.find((m) => m.meetingId === updated.meetingId)
    if (target) {
      target.title = updated.title
    }
  } catch (e: unknown) {
    updateMeetingError.value = e instanceof Error ? e.message : '회의 정보 수정에 실패했습니다.'
  } finally {
    isUpdatingMeeting.value = false
  }
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
    <!-- ── Hero ────────────────────────────────────────────────── -->
    <header class="schedule-hero">
      <div class="schedule-hero-left">
        <p class="schedule-hero-lbl">Schedule</p>
        <h1>회의 일정</h1>
        <p>팀 회의·리뷰·릴리즈 일정을 캘린더에서 한눈에 관리하고, 업무·문서와 연결해 추적합니다.</p>
      </div>
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
          :current-employee-id="authStore.currentUser?.employeeId"
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
      :is-host="isHostOfSelectedMeeting"
      :is-updating-meeting="isUpdatingMeeting"
      :update-meeting-error="updateMeetingError"
      :is-adding-reference="isAddingReference"
      :add-reference-error="addReferenceError"
      :deleting-reference-id="deletingReferenceId"
      :delete-reference-error="deleteReferenceError"
      @close="detailModalOpen = false"
      @open-response="handleDetailOpenResponse"
      @update-meeting="handleUpdateMeeting"
      @add-reference="handleAddReference"
      @delete-reference="handleDeleteReference"
    />
    </div>
  </AppLayout>
</template>

<style scoped>
/* ══ Schedule (Dashboard Unified) ══ */
.schedule-view {
  min-height: calc(100vh - 56px);
  background: var(--page-bg, #F6F7FB);
  padding: 24px 32px 40px;
  display: flex; flex-direction: column; gap: 20px;
}

/* ── Hero ──────────────────────────────────────────────────── */
.schedule-hero {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 32px; border-radius: 16px;
  background: linear-gradient(135deg, #121831 0%, #1F2648 50%, #2A305C 100%);
  color: #fff; box-shadow: 0 8px 32px rgba(18,24,49,.30);
}
.schedule-hero-left { display: flex; flex-direction: column; gap: 4px; }
.schedule-hero-lbl { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.38); }
.schedule-hero-left h1 { font-size: 22px; font-weight: 800; margin: 2px 0 0; color: #fff; }
.schedule-hero-left p { font-size: 12px; color: rgba(255,255,255,.55); margin: 2px 0 0; max-width: 560px; }
.create-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 44px; min-width: 132px; padding: 0 20px; border-radius: 14px;
  border: 0; background: #fff; color: #121831; font-family: var(--font-ui);
  font-size: 14px; font-weight: 600; cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,.18); transition: all .15s;
}
.create-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,.22); }

/* ── Body ──────────────────────────────────────────────────── */
.schedule-body {
  display: flex; flex-direction: column; gap: 20px;
  max-width: 1200px; margin: 0 auto; width: 100%;
}
.schedule-panel {
  background: var(--card-bg, #fff); border: 1px solid #dfe3ee;
  border-radius: 16px; padding: 24px 26px;
  box-shadow: 0 8px 24px rgba(20,24,48,.06);
}

.panel-loading, .panel-error {
  text-align: center; padding: 48px 20px; font-size: 13px;
  color: var(--text-secondary, #6B7191); display: flex; flex-direction: column;
  align-items: center; gap: 14px;
}
.panel-error { color: var(--danger-text, #D45D5D); }

.spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid var(--card-border, #E8EAF2); border-top-color: var(--brand-indigo, #5B52E3); border-radius: 50%; animation: spin .65s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
