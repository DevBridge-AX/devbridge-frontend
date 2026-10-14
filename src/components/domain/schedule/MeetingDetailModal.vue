<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  AddParticipantsRequest,
  ManualConfirmRequest,
  MeetingDetailResponse,
  MeetingReferenceRequest,
  MeetingStatus,
  TimeSlot,
  UpdateMeetingRequest,
  WorkspaceMemberResponse,
} from '@/api/scheduleApi'
import { documentService } from '@/services/documentService'
import MeetingDetailEditForm from '@/components/domain/schedule/MeetingDetailEditForm.vue'
import MeetingDetailHostActions from '@/components/domain/schedule/MeetingDetailHostActions.vue'
import MeetingDetailManualConfirmForm from '@/components/domain/schedule/MeetingDetailManualConfirmForm.vue'
import MeetingDetailParticipants from '@/components/domain/schedule/MeetingDetailParticipants.vue'
import MeetingDetailReferences from '@/components/domain/schedule/MeetingDetailReferences.vue'
import '@/assets/styles/meeting-detail.css'

// ─── Props / Emits ─────────────────────────────────────────────────────────

const props = defineProps<{
  isOpen: boolean
  meeting: MeetingDetailResponse | null
  isLoading: boolean
  loadError?: string
  isHost?: boolean
  currentEmployeeId?: string
  isUpdatingMeeting?: boolean
  updateMeetingError?: string
  isAddingReference?: boolean
  addReferenceError?: string
  deletingReferenceId?: string | null
  deleteReferenceError?: string
  isCancelingMeeting?: boolean
  cancelMeetingError?: string
  isConfirmingManually?: boolean
  confirmManuallyError?: string
  isReopeningMeeting?: boolean
  reopenMeetingError?: string
  memberSearchResults?: WorkspaceMemberResponse[]
  isAddingParticipants?: boolean
  addParticipantsError?: string
  removingParticipantId?: string | null
  removeParticipantError?: string
  isDecliningMeeting?: boolean
  declineMeetingError?: string
}>()

const emit = defineEmits<{
  close: []
  'open-response': [meetingId: string]
  'update-meeting': [payload: UpdateMeetingRequest]
  'add-reference': [payload: MeetingReferenceRequest]
  'delete-reference': [referenceId: string]
  'cancel-meeting': []
  'confirm-meeting-manually': [payload: ManualConfirmRequest]
  'reopen-meeting': []
  'search-participants': [keyword: string]
  'add-participants': [payload: AddParticipantsRequest]
  'remove-participant': [employeeId: string]
  'decline-meeting': []
}>()

// ─── 첨부파일 업로드 ──────────────────────────────────────────────────────────

const isUploadingFile = ref(false)
const uploadError = ref('')

async function handleSelectFiles(files: File[]): Promise<void> {
  uploadError.value = ''
  isUploadingFile.value = true

  try {
    for (const file of files) {
      const { fileUrl } = await documentService.uploadDocument(file)
      emit('add-reference', {
        referenceType: 'DIRECT_FILE',
        fileUrl,
        title: file.name,
      })
    }
  } catch (error: unknown) {
    uploadError.value = error instanceof Error ? error.message : '파일 업로드에 실패했습니다.'
  } finally {
    isUploadingFile.value = false
  }
}

function handleDeleteReference(referenceId: string): void {
  emit('delete-reference', referenceId)
}

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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}

function formatTimeRange(slot: TimeSlot): string {
  const start = new Date(slot.startTime)
  const end = new Date(slot.endTime)
  const datePart = start.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short' })
  const startTime = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} ${startTime} ~ ${endTime}`
}

function isMeetingLinkUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function formatConfirmedRange(meeting: MeetingDetailResponse): string {
  if (!meeting.confirmedStartTime || !meeting.confirmedEndTime) return '-'

  const start = new Date(meeting.confirmedStartTime)
  const end = new Date(meeting.confirmedEndTime)
  const datePart = start.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const startTime = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const endTime = end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return `${datePart} ${startTime} ~ ${endTime}`
}

// ─── 회의 정보 수정 (Host 전용) ──────────────────────────────────────────────

const isEditing = ref(false)

// 모달에 표시되는 회의가 바뀌면 수정 모드를 초기화한다.
watch(
  () => props.meeting?.meetingId,
  () => {
    isEditing.value = false
  },
)

// 수정 요청이 에러 없이 완료되면 수정 모드를 닫는다.
watch(
  () => props.isUpdatingMeeting,
  (isUpdating, wasUpdating) => {
    if (wasUpdating && !isUpdating && !props.updateMeetingError) {
      isEditing.value = false
    }
  },
)

function startEdit(): void {
  isEditing.value = true
}

function cancelEdit(): void {
  isEditing.value = false
}

function handleUpdateMeeting(payload: UpdateMeetingRequest): void {
  emit('update-meeting', payload)
}

// ─── 회의 취소 (Host 전용) ───────────────────────────────────────────────────

function handleCancelMeeting(): void {
  emit('cancel-meeting')
}

// ─── 회의 시간 수동 확정 (Host 전용) ─────────────────────────────────────────

const isManualConfirmFormOpen = ref(false)

watch(
  () => props.meeting?.meetingId,
  () => {
    isManualConfirmFormOpen.value = false
  },
)

watch(
  () => props.isConfirmingManually,
  (isConfirming, wasConfirming) => {
    if (wasConfirming && !isConfirming && !props.confirmManuallyError) {
      isManualConfirmFormOpen.value = false
    }
  },
)

function startManualConfirm(): void {
  isManualConfirmFormOpen.value = true
}

function cancelManualConfirm(): void {
  isManualConfirmFormOpen.value = false
}

function handleConfirmMeetingManually(payload: ManualConfirmRequest): void {
  emit('confirm-meeting-manually', payload)
}

// ─── 회의 재조율 (Host 전용) ─────────────────────────────────────────────────

function handleReopenMeeting(): void {
  emit('reopen-meeting')
}

// ─── 참석자 추가 (Host 전용) ─────────────────────────────────────────────────

const isAddParticipantFormOpen = ref(false)

watch(
  () => props.meeting?.meetingId,
  () => {
    isAddParticipantFormOpen.value = false
  },
)

watch(
  () => props.isAddingParticipants,
  (isAdding, wasAdding) => {
    if (wasAdding && !isAdding && !props.addParticipantsError) {
      isAddParticipantFormOpen.value = false
    }
  },
)

function startAddParticipant(): void {
  isAddParticipantFormOpen.value = true
}

function cancelAddParticipant(): void {
  isAddParticipantFormOpen.value = false
}

function handleSearchParticipants(keyword: string): void {
  emit('search-participants', keyword)
}

function handleAddParticipants(payload: AddParticipantsRequest): void {
  emit('add-participants', payload)
}

function handleRemoveParticipant(employeeId: string): void {
  emit('remove-participant', employeeId)
}

// ─── 참석 거절 (참석자 본인) ─────────────────────────────────────────────────

const myParticipant = computed(() => {
  if (!props.meeting || !props.currentEmployeeId) return null
  return props.meeting.participants.find((p) => p.employeeId === props.currentEmployeeId) ?? null
})

function handleDeclineMeeting(): void {
  emit('decline-meeting')
}

// ─── 이벤트 핸들러 ──────────────────────────────────────────────────────────

function handleClose(): void {
  emit('close')
}

function handleOpenResponse(meetingId: string): void {
  emit('open-response', meetingId)
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay meeting-detail-modal" role="dialog" aria-modal="true">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">{{ meeting?.title ?? '회의 상세' }}</h3>
        <button class="modal-close-btn" type="button" @click="handleClose">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div v-if="isLoading" class="loading-state">
        <span class="spinner spinner--lg" />
        <p>회의 정보를 불러오는 중...</p>
      </div>

      <p v-else-if="loadError" class="status-message status-message--error">{{ loadError }}</p>

      <template v-else-if="meeting">
        <span class="status-badge" :class="STATUS_BADGE_CLASSES[meeting.status]">
          {{ STATUS_LABELS[meeting.status] }}
        </span>

        <!-- 호스트 전용 액션 (정보 수정 / 취소 / 수동 확정 / 재조율) -->
        <MeetingDetailHostActions
          v-if="isHost && !isEditing && !isManualConfirmFormOpen"
          :status="meeting.status"
          :is-reopening-meeting="isReopeningMeeting"
          :is-canceling-meeting="isCancelingMeeting"
          @start-edit="startEdit"
          @start-manual-confirm="startManualConfirm"
          @reopen-meeting="handleReopenMeeting"
          @cancel-meeting="handleCancelMeeting"
        />
        <p v-if="cancelMeetingError" class="field-hint verify-error">{{ cancelMeetingError }}</p>
        <p v-if="reopenMeetingError" class="field-hint verify-error">{{ reopenMeetingError }}</p>

        <!-- 시간 수동 확정 폼 (Host 전용) -->
        <MeetingDetailManualConfirmForm
          v-if="isManualConfirmFormOpen"
          :is-confirming-manually="isConfirmingManually"
          :confirm-manually-error="confirmManuallyError"
          @submit="handleConfirmMeetingManually"
          @cancel="cancelManualConfirm"
        />

        <!-- 회의 정보 수정 폼 -->
        <MeetingDetailEditForm
          v-if="isEditing"
          :meeting="meeting"
          :is-updating-meeting="isUpdatingMeeting"
          :update-meeting-error="updateMeetingError"
          @submit="handleUpdateMeeting"
          @cancel="cancelEdit"
        />

        <!-- 목적 / 아젠다 / 장소 (수정 모드가 아닐 때 표시) -->
        <template v-if="!isEditing">
          <!-- 목적 -->
          <div v-if="meeting.purpose" class="info-box">
            <p class="info-label">목적</p>
            <p class="info-text">{{ meeting.purpose }}</p>
          </div>

          <!-- 아젠다 -->
          <div v-if="meeting.agenda" class="info-box">
            <p class="info-label">아젠다</p>
            <p class="info-text">{{ meeting.agenda }}</p>
          </div>

          <!-- 장소 / 회의 링크 -->
          <div v-if="meeting.location" class="info-box">
            <p class="info-label">장소 / 회의 링크</p>
            <a
              v-if="isMeetingLinkUrl(meeting.location)"
              class="info-text info-link"
              :href="meeting.location"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ meeting.location }}
            </a>
            <p v-else class="info-text">{{ meeting.location }}</p>
          </div>

          <!-- 화상회의 링크 -->
          <div v-if="meeting.meetingLink" class="info-box">
            <p class="info-label">화상회의 링크</p>
            <a
              class="info-text info-link"
              :href="meeting.meetingLink"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ meeting.meetingLink }}
            </a>
          </div>
        </template>

        <!-- GATHERING: 참석자 목록 + 응답 현황 -->
        <template v-if="meeting.status === 'GATHERING'">
          <h4 class="section-title">참석자 응답 현황</h4>
          <MeetingDetailParticipants
            :participants="meeting.participants"
            :show-status="true"
            :can-remove="isHost ?? false"
            :removing-participant-id="removingParticipantId"
            :remove-participant-error="removeParticipantError"
            :can-add="isHost ?? false"
            :is-add-form-open="isAddParticipantFormOpen"
            :member-search-results="memberSearchResults"
            :is-adding-participants="isAddingParticipants"
            :add-participants-error="addParticipantsError"
            @remove-participant="handleRemoveParticipant"
            @search-participants="handleSearchParticipants"
            @add-participants="handleAddParticipants"
            @open-add-form="startAddParticipant"
            @close-add-form="cancelAddParticipant"
          />

          <div class="host-actions">
            <button type="button" class="btn btn--primary" @click="handleOpenResponse(meeting.meetingId)">
              응답하기
            </button>
            <button
              v-if="myParticipant && myParticipant.role !== 'HOST' && myParticipant.status !== 'DECLINED'"
              type="button"
              class="btn btn--secondary"
              :disabled="isDecliningMeeting"
              @click="handleDeclineMeeting"
            >
              <span v-if="isDecliningMeeting" class="spinner" />
              참석 거절
            </button>
          </div>
          <p v-if="declineMeetingError" class="field-hint verify-error">{{ declineMeetingError }}</p>
        </template>

        <!-- SELECTING: 참석자 응답 현황 + 후보 시간 목록 -->
        <template v-else-if="meeting.status === 'SELECTING'">
          <h4 class="section-title">참석자 응답 현황</h4>
          <MeetingDetailParticipants
            :participants="meeting.participants"
            :show-status="true"
            :can-remove="false"
            :can-add="false"
            :is-add-form-open="false"
          />

          <h4 class="section-title section-title--spaced">후보 시간</h4>
          <ul v-if="meeting.topCandidateTimes.length > 0" class="candidate-list">
            <li v-for="(slot, index) in meeting.topCandidateTimes" :key="index" class="candidate-item">
              {{ formatTimeRange(slot) }}
            </li>
          </ul>
          <p v-else class="empty-state">아직 제안된 후보 시간이 없습니다.</p>
        </template>

        <!-- CONFIRMED: 확정 일시 + 소요 시간 + 참석자 목록 -->
        <template v-else-if="meeting.status === 'CONFIRMED'">
          <div class="confirmed-box">
            <p class="confirmed-label">확정 일시</p>
            <p class="confirmed-time">{{ formatConfirmedRange(meeting) }}</p>
            <p class="confirmed-duration">소요 시간 {{ formatDuration(meeting.durationMinutes) }}</p>
          </div>

          <h4 class="section-title section-title--spaced">참석자 목록</h4>
          <MeetingDetailParticipants
            :participants="meeting.participants"
            :show-status="false"
            :can-remove="false"
            :can-add="false"
            :is-add-form-open="false"
          />
        </template>

        <!-- CANCELED -->
        <template v-else>
          <p class="status-message">취소된 회의입니다.</p>
        </template>

        <!-- 첨부파일 -->
        <h4 class="section-title section-title--spaced">첨부파일</h4>
        <MeetingDetailReferences
          :references="meeting.references"
          :deleting-reference-id="deletingReferenceId"
          :is-busy="isUploadingFile || (isAddingReference ?? false)"
          :upload-error="uploadError"
          :add-reference-error="addReferenceError"
          :delete-reference-error="deleteReferenceError"
          @select-files="handleSelectFiles"
          @delete-reference="handleDeleteReference"
        />
      </template>
    </div>
  </div>
</template>
