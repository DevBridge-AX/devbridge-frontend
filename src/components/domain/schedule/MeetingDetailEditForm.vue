<script setup lang="ts">
import { ref } from 'vue'
import type { MeetingDetailResponse, UpdateMeetingRequest } from '@/api/scheduleApi'

// ─── Props / Emits ─────────────────────────────────────────────────────────

const props = defineProps<{
  meeting: MeetingDetailResponse
  isUpdatingMeeting?: boolean
  updateMeetingError?: string
}>()

const emit = defineEmits<{
  submit: [payload: UpdateMeetingRequest]
  cancel: []
}>()

// ─── 회의 정보 수정 (Host 전용) ──────────────────────────────────────────────

// 폼이 열릴 때(마운트) 현재 회의 정보로 입력값을 초기화한다.
const editTitle = ref(props.meeting.title)
const editPurpose = ref(props.meeting.purpose ?? '')
const editAgenda = ref(props.meeting.agenda ?? '')
const editLocation = ref(props.meeting.location ?? '')
const editMeetingLink = ref(props.meeting.meetingLink ?? '')
const editFormError = ref('')

function cancelEdit(): void {
  emit('cancel')
}

function submitEdit(): void {
  editFormError.value = ''

  if (!editTitle.value.trim()) {
    editFormError.value = '회의명을 입력해 주세요.'
    return
  }

  emit('submit', {
    title: editTitle.value.trim(),
    purpose: editPurpose.value.trim(),
    agenda: editAgenda.value.trim(),
    location: editLocation.value.trim(),
    meetingLink: editMeetingLink.value.trim(),
  })
}
</script>

<template>
  <!-- 회의 정보 수정 폼 -->
  <form class="edit-form" @submit.prevent="submitEdit">
    <div class="field">
      <label class="field-label" for="edit-meeting-title">회의명</label>
      <input
        id="edit-meeting-title"
        v-model="editTitle"
        type="text"
        class="field-input"
        placeholder="회의명을 입력하세요"
      />
    </div>

    <div class="field">
      <label class="field-label" for="edit-meeting-purpose">목적</label>
      <input
        id="edit-meeting-purpose"
        v-model="editPurpose"
        type="text"
        class="field-input"
        placeholder="회의 목적 (선택)"
      />
    </div>

    <div class="field">
      <label class="field-label" for="edit-meeting-agenda">아젠다</label>
      <textarea
        id="edit-meeting-agenda"
        v-model="editAgenda"
        class="field-textarea"
        placeholder="회의 아젠다 (선택)"
        rows="3"
      />
    </div>

    <div class="field">
      <label class="field-label" for="edit-meeting-location">장소</label>
      <input
        id="edit-meeting-location"
        v-model="editLocation"
        type="text"
        class="field-input"
        placeholder="회의실 또는 화상회의 링크 (선택)"
      />
    </div>

    <div class="field">
      <label class="field-label" for="edit-meeting-link">화상회의 링크</label>
      <input
        id="edit-meeting-link"
        v-model="editMeetingLink"
        type="text"
        class="field-input"
        placeholder="Zoom/Meet 등 링크 (선택)"
      />
    </div>

    <p v-if="editFormError" class="field-hint verify-error">{{ editFormError }}</p>
    <p v-if="updateMeetingError" class="field-hint verify-error">{{ updateMeetingError }}</p>

    <div class="edit-actions">
      <button type="button" class="btn btn--secondary" :disabled="isUpdatingMeeting" @click="cancelEdit">
        취소
      </button>
      <button type="submit" class="btn btn--primary" :disabled="isUpdatingMeeting">
        <span v-if="isUpdatingMeeting" class="spinner" />
        저장
      </button>
    </div>
  </form>
</template>
