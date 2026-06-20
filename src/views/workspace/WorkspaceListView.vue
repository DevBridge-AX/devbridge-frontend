<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { workspaceService } from '@/services/workspaceService'
import { useWorkspaceStore } from '@/state/workspaceStore'
import type {
  CurrentUserResponse,
  Workspace,
  WorkspaceInvitation,
  WorkspacePermission,
} from '@/api/workspaceApi'

const router = useRouter()
const workspaceStore = useWorkspaceStore()

const isLoading = ref(false)
const isLoadingInvitations = ref(false)
const isSubmittingCreate = ref(false)
const isSubmittingInvite = ref(false)
const acceptingInvitationId = ref<string | null>(null)

const errorMessage = ref('')
const invitationErrorMessage = ref('')

const currentUser = ref<CurrentUserResponse | null>(null)
const workspaces = ref<Workspace[]>([])
const receivedInvitations = ref<WorkspaceInvitation[]>([])

const isCreateModalOpen = ref(false)
const isInviteModalOpen = ref(false)
const selectedWorkspace = ref<Workspace | null>(null)

const createForm = ref<{
  name: string
  purpose: string
  description: string
  initialInviteEmail: string
  initialInviteRole: WorkspacePermission
}>({
  name: '',
  purpose: 'DEVELOPMENT',
  description: '',
  initialInviteEmail: '',
  initialInviteRole: 'MEMBER',
})

const inviteForm = ref<{
  email: string
  role: WorkspacePermission
}>({
  email: '',
  role: 'MEMBER',
})

const purposeOptions = [
  { value: 'DEVELOPMENT', label: '개발 프로젝트' },
  { value: 'PLANNING', label: '기획 프로젝트' },
  { value: 'DESIGN', label: '디자인 프로젝트' },
  { value: 'QA', label: 'QA / 테스트' },
  { value: 'OPERATION', label: '운영 관리' },
  { value: 'INTEGRATED', label: '통합 프로젝트' },
]

const isSystemAdmin = computed(() => {
  const systemRole = currentUser.value?.systemRole

  if (!systemRole) {
    return false
  }

  return systemRole.toUpperCase().includes('ADMIN')
})

const loadCurrentUser = async () => {
  try {
    currentUser.value = await workspaceService.getCurrentUser()
  } catch (error) {
    console.error(error)
    currentUser.value = null
  }
}

const loadWorkspaces = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    workspaces.value = await workspaceService.getMyWorkspaces()
  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMessage.value = error.message
      return
    }

    errorMessage.value = '워크스페이스 목록을 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

const loadReceivedInvitations = async () => {
  isLoadingInvitations.value = true
  invitationErrorMessage.value = ''

  try {
    receivedInvitations.value = await workspaceService.getReceivedInvitations()
  } catch (error: unknown) {
    console.error(error)

    if (error instanceof Error) {
      invitationErrorMessage.value = error.message
      return
    }

    invitationErrorMessage.value =
      '받은 워크스페이스 초대 목록을 불러오지 못했습니다.'
  } finally {
    isLoadingInvitations.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([loadWorkspaces(), loadReceivedInvitations()])
}

const enterWorkspace = async (workspaceId: string) => {
  errorMessage.value = ''
  workspaceStore.setWorkspaceId(workspaceId)

  try {
    await workspaceService.updateWorkspaceAccess(workspaceId)
  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMessage.value = error.message
      return
    }

    errorMessage.value = '워크스페이스 접속 정보를 갱신하지 못했습니다.'
    return
  }

  await router.push(`/workspaces/${workspaceId}/dashboard`)
}

const openCreateModal = () => {
  createForm.value = {
    name: '',
    purpose: 'DEVELOPMENT',
    description: '',
    initialInviteEmail: '',
    initialInviteRole: 'MEMBER',
  }
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  if (isSubmittingCreate.value) {
    return
  }

  isCreateModalOpen.value = false
}

const buildWorkspaceDescription = () => {
  const selectedPurpose = purposeOptions.find(
    (option) => option.value === createForm.value.purpose,
  )

  const purposeLabel = selectedPurpose?.label ?? createForm.value.purpose
  const description = createForm.value.description.trim()

  if (!description) {
    return `운영 목적: ${purposeLabel}`
  }

  return `운영 목적: ${purposeLabel}\n\n${description}`
}

const submitCreateWorkspace = async () => {
  if (!createForm.value.name.trim()) {
    alert('Workspace 이름을 입력해 주세요.')
    return
  }

  isSubmittingCreate.value = true

  try {
    const createdWorkspace = await workspaceService.createWorkspace({
      name: createForm.value.name.trim(),
      description: buildWorkspaceDescription(),
    })

    const initialInviteEmail = createForm.value.initialInviteEmail.trim()

    if (initialInviteEmail) {
      await workspaceService.inviteMember(createdWorkspace.id, {
        email: initialInviteEmail,
        role: createForm.value.initialInviteRole,
      })
    }

    alert('Workspace를 생성했습니다.')
    isCreateModalOpen.value = false
    await refreshAll()
  } catch (error: unknown) {
    console.error(error)
    alert(
      error instanceof Error
        ? error.message
        : 'Workspace를 생성하지 못했습니다.',
    )
  } finally {
    isSubmittingCreate.value = false
  }
}

const openInviteModal = (workspace: Workspace) => {
  selectedWorkspace.value = workspace
  inviteForm.value = {
    email: '',
    role: 'MEMBER',
  }
  isInviteModalOpen.value = true
}

const closeInviteModal = () => {
  if (isSubmittingInvite.value) {
    return
  }

  isInviteModalOpen.value = false
  selectedWorkspace.value = null
}

const submitInviteMember = async () => {
  if (!selectedWorkspace.value) {
    alert('초대할 Workspace를 선택하지 못했습니다.')
    return
  }

  if (!inviteForm.value.email.trim()) {
    alert('초대할 이메일을 입력해 주세요.')
    return
  }

  isSubmittingInvite.value = true

  try {
    await workspaceService.inviteMember(selectedWorkspace.value.id, {
      email: inviteForm.value.email.trim(),
      role: inviteForm.value.role,
    })

    alert('멤버 초대를 생성했습니다.')
    closeInviteModal()
    await loadReceivedInvitations()
  } catch (error: unknown) {
    console.error(error)
    alert(
      error instanceof Error
        ? error.message
        : '멤버 초대를 생성하지 못했습니다.',
    )
  } finally {
    isSubmittingInvite.value = false
  }
}

const acceptWorkspaceInvitation = async (invitationId: string) => {
  acceptingInvitationId.value = invitationId

  try {
    await workspaceService.acceptInvitation(invitationId)
    alert('워크스페이스 초대를 수락했습니다.')

    await refreshAll()
  } catch (error: unknown) {
    console.error(error)
    alert(
      error instanceof Error
        ? error.message
        : '워크스페이스 초대를 수락하지 못했습니다.',
    )
  } finally {
    acceptingInvitationId.value = null
  }
}

onMounted(async () => {
  await loadCurrentUser()
  await refreshAll()
})
</script>

<template>
  <AppLayout>
    <section class="workspace-page">
      <div class="page-header">
        <div>
          <p class="eyebrow">Workspace</p>
          <h1>내 워크스페이스</h1>
          <p class="description">
            참여 중인 워크스페이스를 선택하면 해당 대시보드로 이동합니다.
          </p>
        </div>

        <div class="header-actions">
          <button class="refresh-button" type="button" @click="refreshAll">
            새로고침
          </button>

          <button
            v-if="isSystemAdmin"
            class="create-button"
            type="button"
            @click="openCreateModal"
          >
            Workspace 생성하기
          </button>
        </div>
      </div>

      <section class="invitation-section">
        <div class="section-title-row">
          <div>
            <p class="section-eyebrow">Invitation</p>
            <h2>받은 Workspace 초대</h2>
          </div>

          <button
            class="text-button"
            type="button"
            :disabled="isLoadingInvitations"
            @click="loadReceivedInvitations"
          >
            초대 새로고침
          </button>
        </div>

        <div v-if="isLoadingInvitations" class="state-box compact">
          받은 초대 목록을 불러오는 중입니다.
        </div>

        <div v-else-if="invitationErrorMessage" class="state-box error compact">
          {{ invitationErrorMessage }}
        </div>

        <div
          v-else-if="receivedInvitations.length === 0"
          class="state-box compact"
        >
          받은 Workspace 초대가 없습니다.
        </div>

        <div v-else class="invitation-list">
          <article
            v-for="invitation in receivedInvitations"
            :key="invitation.invitationId"
            class="invitation-card"
          >
            <div>
              <h3>{{ invitation.workspaceName }}</h3>
              <p>초대 이메일: {{ invitation.invitedEmail }}</p>
              <p>권한: {{ invitation.assignedPermission }}</p>
            </div>

            <button
              class="accept-button"
              type="button"
              :disabled="acceptingInvitationId === invitation.invitationId"
              @click="acceptWorkspaceInvitation(invitation.invitationId)"
            >
              {{
                acceptingInvitationId === invitation.invitationId
                  ? '수락 중'
                  : '수락'
              }}
            </button>
          </article>
        </div>
      </section>

      <section v-if="isLoading" class="state-box">
        워크스페이스 목록을 불러오는 중입니다.
      </section>

      <section v-else-if="errorMessage" class="state-box error">
        <strong>조회 실패</strong>
        <p>{{ errorMessage }}</p>
        <button class="retry-button" type="button" @click="loadWorkspaces">
          다시 시도
        </button>
      </section>

      <section v-else-if="workspaces.length === 0" class="state-box">
        참여 중인 워크스페이스가 없습니다.
      </section>

      <section v-else class="workspace-grid">
        <article
          v-for="workspace in workspaces"
          :key="workspace.id"
          class="workspace-card"
        >
          <div>
            <div class="card-title-row">
              <h2>{{ workspace.name }}</h2>
              <span v-if="workspace.myPermission" class="permission-badge">
                {{ workspace.myPermission }}
              </span>
            </div>

            <p>
              {{
                workspace.description ||
                '설명이 등록되지 않은 워크스페이스입니다.'
              }}
            </p>
          </div>

          <div class="card-actions">
            <button
              v-if="workspace.myPermission === 'OWNER'"
              class="secondary-button"
              type="button"
              @click="openInviteModal(workspace)"
            >
              멤버 추가
            </button>

            <button
              class="enter-button"
              type="button"
              @click="enterWorkspace(workspace.id)"
            >
              대시보드로 이동
            </button>
          </div>
        </article>
      </section>
    </section>

    <div v-if="isCreateModalOpen" class="modal-backdrop">
      <section class="modal-card wide">
        <div class="modal-header">
          <div>
            <p class="section-eyebrow">Create Workspace</p>
            <h2>Workspace 생성</h2>
          </div>

          <button class="close-button" type="button" @click="closeCreateModal">
            ×
          </button>
        </div>

        <div class="form-section">
          <h3>기본 정보</h3>

          <label>
            Workspace 이름
            <input
              v-model="createForm.name"
              type="text"
              placeholder="예: DevBridge AX"
            />
          </label>

          <label>
            운영 목적
            <select v-model="createForm.purpose">
              <option
                v-for="option in purposeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            설명
            <textarea
              v-model="createForm.description"
              rows="4"
              placeholder="Workspace 설명을 입력하세요."
            />
          </label>
        </div>

        <div class="form-section">
          <h3>권한 구조</h3>

          <div class="permission-guide">
            <div class="permission-guide-card">
              <strong>OWNER</strong>
              <p>
                Workspace 생성자입니다. 멤버 초대와 주요 관리 권한을 가집니다.
              </p>
            </div>

            <div class="permission-guide-card">
              <strong>MEMBER</strong>
              <p>
                일반 참여자입니다. Task, Document 등 협업 기능을 사용합니다.
              </p>
            </div>

            <div class="permission-guide-card">
              <strong>GUEST</strong>
              <p>제한된 참여자입니다. 조회 중심 권한으로 운영할 수 있습니다.</p>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>초기 멤버 초대</h3>

          <div class="inline-fields">
            <label>
              이메일
              <input
                v-model="createForm.initialInviteEmail"
                type="email"
                placeholder="member@example.com"
              />
            </label>

            <label>
              권한
              <select v-model="createForm.initialInviteRole">
                <option value="MEMBER">MEMBER</option>
                <option value="GUEST">GUEST</option>
              </select>
            </label>
          </div>

          <p class="helper-text">
            비워두면 Workspace만 생성됩니다. OWNER 권한은 초대로 부여하지
            않습니다.
          </p>
        </div>

        <div class="modal-actions">
          <button
            class="secondary-button"
            type="button"
            :disabled="isSubmittingCreate"
            @click="closeCreateModal"
          >
            취소
          </button>

          <button
            class="primary-button"
            type="button"
            :disabled="isSubmittingCreate"
            @click="submitCreateWorkspace"
          >
            {{ isSubmittingCreate ? '생성 중' : 'Workspace 생성' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="isInviteModalOpen" class="modal-backdrop">
      <section class="modal-card">
        <div class="modal-header">
          <div>
            <p class="section-eyebrow">Invite Member</p>
            <h2>멤버 추가</h2>
          </div>

          <button class="close-button" type="button" @click="closeInviteModal">
            ×
          </button>
        </div>

        <p class="modal-description">
          {{ selectedWorkspace?.name }} Workspace에 멤버를 초대합니다.
        </p>

        <label>
          이메일
          <input
            v-model="inviteForm.email"
            type="email"
            placeholder="member@example.com"
          />
        </label>

        <label>
          권한
          <select v-model="inviteForm.role">
            <option value="MEMBER">MEMBER</option>
            <option value="GUEST">GUEST</option>
          </select>
        </label>

        <div class="modal-actions">
          <button
            class="secondary-button"
            type="button"
            :disabled="isSubmittingInvite"
            @click="closeInviteModal"
          >
            취소
          </button>

          <button
            class="primary-button"
            type="button"
            :disabled="isSubmittingInvite"
            @click="submitInviteMember"
          >
            {{ isSubmittingInvite ? '초대 중' : '초대하기' }}
          </button>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

<style scoped>
.workspace-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, #172033, #263b70);
  color: white;
  padding: 32px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #b7c4ff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.25;
}

.description {
  max-width: 560px;
  margin: 12px 0 0;
  color: #d8def8;
  line-height: 1.6;
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 180px;
  flex-shrink: 0;
}

.refresh-button,
.create-button,
.retry-button,
.enter-button,
.secondary-button,
.primary-button,
.accept-button,
.text-button,
.close-button {
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  white-space: nowrap;
}

.refresh-button {
  background: white;
  color: #263b70;
  padding: 12px 18px;
}

.create-button {
  background: #12b76a;
  color: white;
  padding: 12px 18px;
}

.invitation-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  background: white;
  box-shadow: 0 12px 32px rgba(16, 24, 40, 0.06);
  padding: 24px;
}

.section-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-title-row h2 {
  margin: 0;
  color: #172033;
  font-size: 22px;
  line-height: 1.3;
}

.section-eyebrow {
  margin: 0 0 4px;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.text-button {
  background: #eef2ff;
  color: #263b70;
  padding: 10px 14px;
}

.invitation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invitation-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #d0d5dd;
  border-radius: 18px;
  background: #f9fafb;
  padding: 18px;
}

.invitation-card h3 {
  margin: 0;
  color: #172033;
  font-size: 18px;
  line-height: 1.35;
}

.invitation-card p {
  margin: 6px 0 0;
  color: #667085;
  line-height: 1.5;
}

.accept-button {
  background: #263b70;
  color: white;
  padding: 10px 14px;
  flex-shrink: 0;
}

.state-box {
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: white;
  color: #475467;
  padding: 28px;
}

.state-box.compact {
  border-radius: 16px;
  background: #f9fafb;
  padding: 18px;
}

.state-box.error {
  border-color: #fecaca;
  background: #fff7f7;
  color: #b42318;
}

.state-box p {
  margin: 8px 0 16px;
}

.retry-button {
  background: #b42318;
  color: white;
  padding: 10px 14px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  align-items: stretch;
}

.workspace-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 210px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  background: white;
  box-shadow: 0 12px 32px rgba(16, 24, 40, 0.06);
  padding: 24px;
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.workspace-card h2 {
  margin: 0;
  color: #172033;
  font-size: 22px;
  line-height: 1.3;
  word-break: keep-all;
}

.workspace-card p {
  margin: 12px 0 0;
  color: #667085;
  line-height: 1.6;
  white-space: pre-line;
  word-break: keep-all;
}

.permission-badge {
  flex-shrink: 0;
  border-radius: 999px;
  background: #eef2ff;
  color: #263b70;
  font-size: 12px;
  font-weight: 800;
  padding: 6px 10px;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.enter-button {
  background: #263b70;
  color: white;
  padding: 12px 16px;
}

.secondary-button {
  border: 1px solid #d0d5dd;
  background: white;
  color: #344054;
  padding: 12px 16px;
}

.primary-button {
  background: #263b70;
  color: white;
  padding: 12px 16px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.enter-button:hover,
.refresh-button:hover,
.retry-button:hover,
.create-button:hover,
.secondary-button:hover,
.primary-button:hover,
.accept-button:hover,
.text-button:hover {
  opacity: 0.9;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  padding: 24px;
}

.modal-card {
  width: min(520px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  border-radius: 24px;
  background: white;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.25);
  padding: 28px;
}

.modal-card.wide {
  width: min(760px, 100%);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.modal-header h2 {
  margin: 0;
  color: #172033;
}

.close-button {
  width: 36px;
  height: 36px;
  background: #f2f4f7;
  color: #344054;
  font-size: 24px;
  line-height: 1;
}

.modal-description {
  margin: 0 0 18px;
  color: #667085;
  line-height: 1.6;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-top: 1px solid #eaecf0;
  padding-top: 20px;
  margin-top: 20px;
}

.form-section:first-of-type {
  border-top: 0;
  padding-top: 0;
  margin-top: 0;
}

.form-section h3 {
  margin: 0;
  color: #172033;
  font-size: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #344054;
  font-size: 14px;
  font-weight: 700;
}

input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d0d5dd;
  border-radius: 12px;
  color: #172033;
  font: inherit;
  padding: 12px 14px;
}

textarea {
  resize: vertical;
}

.inline-fields {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 12px;
}

.permission-guide {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.permission-guide-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #f9fafb;
  padding: 14px;
}

.permission-guide-card strong {
  color: #263b70;
}

.permission-guide-card p {
  margin: 8px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.helper-text {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

@media (max-width: 900px) {
  .workspace-page {
    max-width: none;
  }

  .page-header,
  .section-title-row,
  .invitation-card {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
  }

  .refresh-button,
  .create-button {
    width: 100%;
  }

  .inline-fields,
  .permission-guide {
    grid-template-columns: 1fr;
  }
}
</style>
