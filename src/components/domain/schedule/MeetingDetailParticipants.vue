<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  AddParticipantsRequest,
  MeetingDetailResponse,
  ParticipantRole,
  ParticipantStatus,
  WorkspaceMemberResponse,
} from '@/api/scheduleApi'

// ─── Props / Emits ─────────────────────────────────────────────────────────

const props = defineProps<{
  participants: MeetingDetailResponse['participants']
  showStatus: boolean
  canRemove: boolean
  removingParticipantId?: string | null
  removeParticipantError?: string
  canAdd: boolean
  isAddFormOpen: boolean
  memberSearchResults?: WorkspaceMemberResponse[]
  isAddingParticipants?: boolean
  addParticipantsError?: string
}>()

const emit = defineEmits<{
  'remove-participant': [employeeId: string]
  'search-participants': [keyword: string]
  'add-participants': [payload: AddParticipantsRequest]
  'open-add-form': []
  'close-add-form': []
}>()

// ─── 상태 → 라벨 / 배지 클래스 매핑 ────────────────────────────────────────

const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  HOST: '주최자',
  ATTENDEE: '참석자',
}

const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  PENDING: '응답 대기',
  RESPONDED: '응답 완료',
  DECLINED: '불참',
}

const PARTICIPANT_STATUS_BADGE_CLASSES: Record<ParticipantStatus, string> = {
  PENDING: 'participant-badge--pending',
  RESPONDED: 'participant-badge--responded',
  DECLINED: 'participant-badge--declined',
}

// ─── 참석자 추가 (Host 전용) ─────────────────────────────────────────────────

const participantSearchKeyword = ref('')
const selectedNewParticipants = ref<WorkspaceMemberResponse[]>([])
let participantSearchTimer: ReturnType<typeof setTimeout> | null = null

const showParticipantDropdown = computed(
  () => participantSearchKeyword.value.trim().length > 0 && (props.memberSearchResults?.length ?? 0) > 0,
)

function startAddParticipant(): void {
  participantSearchKeyword.value = ''
  selectedNewParticipants.value = []
  emit('open-add-form')
}

function cancelAddParticipant(): void {
  emit('close-add-form')
}

function handleParticipantSearchInput(): void {
  if (participantSearchTimer) clearTimeout(participantSearchTimer)
  participantSearchTimer = setTimeout(() => {
    emit('search-participants', participantSearchKeyword.value.trim())
  }, 300)
}

function selectNewParticipant(member: WorkspaceMemberResponse): void {
  if (selectedNewParticipants.value.some((m) => m.employeeId === member.employeeId)) return
  selectedNewParticipants.value.push(member)
  participantSearchKeyword.value = ''
}

function removeNewParticipant(employeeId: string): void {
  selectedNewParticipants.value = selectedNewParticipants.value.filter((m) => m.employeeId !== employeeId)
}

function submitAddParticipants(): void {
  if (selectedNewParticipants.value.length === 0) return

  emit('add-participants', {
    employeeIds: selectedNewParticipants.value.map((m) => m.employeeId),
  })
}

function handleRemoveParticipant(employeeId: string): void {
  emit('remove-participant', employeeId)
}
</script>

<template>
  <ul v-if="participants.length > 0" class="participant-list">
    <li v-for="p in participants" :key="p.employeeId" class="participant-item">
      <span class="participant-id">{{ p.name ?? p.employeeId }} <template v-if="p.department || p.position">/ {{ [p.department, p.position].filter(Boolean).join(' - ') }}</template></span>
      <span class="participant-role">{{ PARTICIPANT_ROLE_LABELS[p.role] }}</span>
      <span v-if="showStatus" class="participant-badge" :class="PARTICIPANT_STATUS_BADGE_CLASSES[p.status]">
        {{ PARTICIPANT_STATUS_LABELS[p.status] }}
      </span>
      <button
        v-if="canRemove && p.role !== 'HOST'"
        type="button"
        class="reference-remove"
        :disabled="removingParticipantId === p.employeeId"
        @click="handleRemoveParticipant(p.employeeId)"
      >
        <span v-if="removingParticipantId === p.employeeId" class="spinner" />
        <span v-else>×</span>
      </button>
    </li>
  </ul>
  <p v-else class="empty-state">참석자가 없습니다.</p>
  <p v-if="removeParticipantError" class="field-hint verify-error">{{ removeParticipantError }}</p>

  <!-- 참석자 추가 (Host 전용) -->
  <template v-if="canAdd">
    <button
      v-if="!isAddFormOpen"
      type="button"
      class="btn btn--secondary"
      @click="startAddParticipant"
    >
      참석자 추가
    </button>

    <div v-else class="edit-form">
      <div class="field participant-field">
        <label class="field-label" for="participant-search-input">참석자 검색</label>
        <input
          id="participant-search-input"
          v-model="participantSearchKeyword"
          type="text"
          class="field-input"
          placeholder="이름 또는 사번으로 검색"
          @input="handleParticipantSearchInput"
        />
        <ul v-if="showParticipantDropdown" class="member-dropdown">
          <li
            v-for="member in memberSearchResults"
            :key="member.employeeId"
            class="member-option"
            @click="selectNewParticipant(member)"
          >
            <span class="member-name">{{ member.name }}</span>
            <span class="member-meta">{{ [member.department, member.position].filter(Boolean).join(' - ') }}</span>
          </li>
        </ul>
      </div>

      <div v-if="selectedNewParticipants.length > 0" class="chip-list">
        <span v-for="member in selectedNewParticipants" :key="member.employeeId" class="chip">
          {{ member.name }}
          <button type="button" class="chip-remove" @click="removeNewParticipant(member.employeeId)">×</button>
        </span>
      </div>

      <p v-if="addParticipantsError" class="field-hint verify-error">{{ addParticipantsError }}</p>

      <div class="edit-actions">
        <button
          type="button"
          class="btn btn--secondary"
          :disabled="isAddingParticipants"
          @click="cancelAddParticipant"
        >
          취소
        </button>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="isAddingParticipants || selectedNewParticipants.length === 0"
          @click="submitAddParticipants"
        >
          <span v-if="isAddingParticipants" class="spinner" />
          추가
        </button>
      </div>
    </div>
  </template>
</template>
