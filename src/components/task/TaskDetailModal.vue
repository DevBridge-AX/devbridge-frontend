<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { taskService } from '@/services/taskService'
import { gitService } from '@/services/gitService'
import { documentService } from '@/services/documentService'
import { useAuthStore } from '@/state/authStore'
import type { TaskDetail } from '@/api/taskApi'
import type { GitCommitItem } from '@/api/gitApi'

const props = defineProps<{
  taskId: string | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const authStore = useAuthStore()

const activeTab = ref<
  'overview' | 'documents' | 'changes' | 'deliverables' | 'activity'
>('overview')

const isLoading = ref(false)
const isGitLoading = ref(false)
const isUploadingDocument = ref(false)

const errorMessage = ref('')
const gitErrorMessage = ref('')
const uploadErrorMessage = ref('')
const analysisErrorMessage = ref('')

const taskDetail = ref<TaskDetail | null>(null)
const recentGitCommits = ref<GitCommitItem[]>([])

const uploadFile = ref<File | null>(null)
const uploadDocumentType = ref('SPEC')
const uploadDescription = ref('')

const analyzingDocumentId = ref<string | null>(null)

const statusLabel = computed(() => {
  const status = taskDetail.value?.status

  if (status === 'DONE' || status === 'COMPLETED') return '완료'
  if (status === 'IN_PROGRESS') return '진행 중'
  if (status === 'REVIEW') return '검토'
  if (status === 'OVERDUE') return '지연'
  if (status === 'ASSIGNED') return '배정'
  if (status === 'CANCELLED') return '취소'

  return status || '상태 없음'
})

const riskLabel = computed(() => {
  const riskLevel = taskDetail.value?.riskLevel

  if (riskLevel === 'HIGH') return '높음'
  if (riskLevel === 'MEDIUM') return '보통'
  if (riskLevel === 'LOW') return '낮음'

  return '미정'
})

const assigneeLabel = computed(() => {
  return taskDetail.value?.assigneeName || '미지정'
})

async function fetchTaskDetail() {
  if (!props.taskId || !props.isOpen) {
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    taskDetail.value = await taskService.getTaskDetail(props.taskId)
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : '업무 상세 정보를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

async function fetchRecentGitCommits() {
  isGitLoading.value = true
  gitErrorMessage.value = ''

  try {
    recentGitCommits.value = await gitService.getRecentCommits(5)
  } catch (error: unknown) {
    gitErrorMessage.value =
      error instanceof Error
        ? error.message
        : 'Git 변경사항을 불러오지 못했습니다.'
  } finally {
    isGitLoading.value = false
  }
}

function changeTab(
  tab: 'overview' | 'documents' | 'changes' | 'deliverables' | 'activity',
) {
  activeTab.value = tab

  if (tab === 'changes' && recentGitCommits.value.length === 0) {
    void fetchRecentGitCommits()
  }
}

function closeModal() {
  emit('close')
}

function handleOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}

function handleUploadFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null

  uploadFile.value = file
}

function resetUploadForm() {
  uploadFile.value = null
  uploadDocumentType.value = 'SPEC'
  uploadDescription.value = ''
  uploadErrorMessage.value = ''
}

async function submitTaskDocumentUpload() {
  if (!taskDetail.value || !props.taskId) {
    uploadErrorMessage.value = '업무 정보를 확인할 수 없습니다.'
    return
  }

  if (!uploadFile.value) {
    uploadErrorMessage.value = '업로드할 파일을 선택해 주세요.'
    return
  }

  isUploadingDocument.value = true
  uploadErrorMessage.value = ''

  try {
    await documentService.uploadWorkspaceDocument({
      workspaceId: taskDetail.value.workspaceId,
      uploadedById: authStore.currentUser?.id ?? null,
      taskId: props.taskId,
      documentType: uploadDocumentType.value,
      description: uploadDescription.value,
      file: uploadFile.value,
    })

    alert('업무 문서를 업로드했습니다.')
    resetUploadForm()
    activeTab.value = 'documents'
    await fetchTaskDetail()
  } catch (error: unknown) {
    uploadErrorMessage.value =
      error instanceof Error
        ? error.message
        : '업무 문서 업로드에 실패했습니다.'
  } finally {
    isUploadingDocument.value = false
  }
}

async function analyzeTaskDocument(documentId: string) {
  if (!documentId) {
    analysisErrorMessage.value = '분석할 문서 정보가 없습니다.'
    return
  }

  analyzingDocumentId.value = documentId
  analysisErrorMessage.value = ''

  try {
    await documentService.analyzeDocument(documentId)
    await fetchTaskDetail()
    activeTab.value = 'documents'
  } catch (error: unknown) {
    analysisErrorMessage.value =
      error instanceof Error ? error.message : '문서 AI 분석에 실패했습니다.'
  } finally {
    analyzingDocumentId.value = null
  }
}

watch(
  () => [props.taskId, props.isOpen],
  () => {
    if (props.isOpen) {
      activeTab.value = 'overview'
      recentGitCommits.value = []
      gitErrorMessage.value = ''
      analysisErrorMessage.value = ''
      analyzingDocumentId.value = null
      resetUploadForm()
      void fetchTaskDetail()
    }
  },
)

onMounted(() => {
  void fetchTaskDetail()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="task-modal-overlay"
      role="dialog"
      aria-modal="true"
      @click="handleOverlayClick"
    >
      <section class="task-modal">
        <header class="task-modal-header">
          <div>
            <p class="task-modal-eyebrow">Task Detail</p>
            <h2>{{ taskDetail?.title || '업무 상세' }}</h2>
            <p class="task-modal-subtitle">
              {{ taskDetail?.workspaceName || 'Workspace' }}
            </p>
          </div>

          <button
            type="button"
            class="task-modal-close"
            aria-label="업무 상세 닫기"
            @click="closeModal"
          >
            ×
          </button>
        </header>

        <div v-if="isLoading" class="task-modal-state">
          업무 상세 정보를 불러오는 중입니다.
        </div>

        <div v-else-if="errorMessage" class="task-modal-state error">
          {{ errorMessage }}
        </div>

        <div v-else-if="taskDetail" class="task-modal-content">
          <section class="task-hero">
            <div class="task-hero-main">
              <span class="status-badge" :class="taskDetail.status">
                {{ statusLabel }}
              </span>

              <h3>{{ taskDetail.title }}</h3>
              <p>
                {{
                  taskDetail.description ||
                  '등록된 업무 설명이 없습니다. 관련 문서와 변경 이력을 연결하면 업무 맥락을 더 명확하게 확인할 수 있습니다.'
                }}
              </p>
            </div>

            <div class="task-hero-meta">
              <div>
                <span>담당자</span>
                <strong>{{ assigneeLabel }}</strong>
              </div>
              <div>
                <span>요청자</span>
                <strong>{{ taskDetail.requesterName }}</strong>
              </div>
              <div>
                <span>마감일</span>
                <strong>{{ taskDetail.dueDate || '미정' }}</strong>
              </div>
              <div>
                <span>위험도</span>
                <strong>{{ riskLabel }}</strong>
              </div>
            </div>
          </section>

          <section class="task-summary-grid">
            <article>
              <span>Documents</span>
              <strong>{{ taskDetail.documentCount }}</strong>
            </article>
            <article>
              <span>Git Changes</span>
              <strong>
                {{
                  recentGitCommits.length > 0
                    ? recentGitCommits.length
                    : taskDetail.commitCount
                }}
              </strong>
            </article>
            <article>
              <span>Deliverables</span>
              <strong>{{ taskDetail.deliverableCount }}</strong>
            </article>
            <article>
              <span>Activities</span>
              <strong>{{ taskDetail.activityCount }}</strong>
            </article>
          </section>

          <nav class="task-tabs" aria-label="Task detail tabs">
            <button
              type="button"
              :class="{ active: activeTab === 'overview' }"
              @click="changeTab('overview')"
            >
              Overview
            </button>
            <button
              type="button"
              :class="{ active: activeTab === 'documents' }"
              @click="changeTab('documents')"
            >
              Documents
            </button>
            <button
              type="button"
              :class="{ active: activeTab === 'changes' }"
              @click="changeTab('changes')"
            >
              Recent Changes
            </button>
            <button
              type="button"
              :class="{ active: activeTab === 'deliverables' }"
              @click="changeTab('deliverables')"
            >
              Deliverables
            </button>
            <button
              type="button"
              :class="{ active: activeTab === 'activity' }"
              @click="changeTab('activity')"
            >
              Activity
            </button>
          </nav>

          <section class="task-tab-panel">
            <div v-if="activeTab === 'overview'" class="overview-panel">
              <article class="detail-card">
                <span>AI Summary</span>
                <p>
                  {{
                    taskDetail.aiSummary ||
                    '아직 AI 분석 요약이 없습니다. 문서 분석과 AI Engine 연결 후 이 영역에 업무 요약이 표시됩니다.'
                  }}
                </p>
              </article>

              <article class="detail-card">
                <span>Progress Summary</span>
                <p>{{ taskDetail.progressSummary }}</p>
              </article>

              <article class="detail-card">
                <span>Next Action</span>
                <p>{{ taskDetail.nextAction }}</p>
              </article>
            </div>

            <div v-else-if="activeTab === 'documents'" class="list-panel">
              <article class="upload-card">
                <div class="upload-card-header">
                  <div>
                    <strong>이 Task에 문서 업로드</strong>
                    <p>
                      업로드한 파일은 현재 업무에 연결되며, 이후 AI 분석 결과가
                      Documents 탭과 업무 요약에 반영됩니다.
                    </p>
                  </div>
                </div>

                <div v-if="uploadErrorMessage" class="upload-error">
                  {{ uploadErrorMessage }}
                </div>

                <div class="upload-form-grid">
                  <label>
                    문서 유형
                    <select v-model="uploadDocumentType">
                      <option value="SPEC">SPEC</option>
                      <option value="REPORT">REPORT</option>
                      <option value="MEETING_NOTE">MEETING_NOTE</option>
                      <option value="DESIGN">DESIGN</option>
                      <option value="ETC">ETC</option>
                    </select>
                  </label>

                  <label>
                    파일
                    <input
                      type="file"
                      :disabled="isUploadingDocument"
                      @change="handleUploadFileChange"
                    />
                  </label>
                </div>

                <label>
                  설명
                  <textarea
                    v-model="uploadDescription"
                    rows="3"
                    placeholder="문서 설명 또는 업로드 목적을 입력하세요."
                  />
                </label>

                <div class="upload-actions">
                  <button
                    type="button"
                    class="task-mini-button"
                    :disabled="isUploadingDocument"
                    @click="submitTaskDocumentUpload"
                  >
                    {{ isUploadingDocument ? '업로드 중...' : '문서 업로드' }}
                  </button>
                </div>
              </article>

              <div v-if="analysisErrorMessage" class="upload-error">
                {{ analysisErrorMessage }}
              </div>

              <article
                v-for="document in taskDetail.recentDocuments"
                :key="document.id"
                class="linked-item document-analysis-item"
              >
                <div class="document-analysis-header">
                  <div>
                    <strong>{{ document.title }}</strong>
                    <p>
                      {{ document.summary || '아직 분석 요약이 없습니다.' }}
                    </p>
                  </div>

                  <button
                    type="button"
                    class="task-mini-button"
                    :disabled="analyzingDocumentId === document.id"
                    @click="analyzeTaskDocument(document.id)"
                  >
                    {{
                      analyzingDocumentId === document.id
                        ? '분석 중...'
                        : document.analysisStatus === 'COMPLETED'
                          ? 'AI 재분석'
                          : 'AI 분석 실행'
                    }}
                  </button>
                </div>

                <div class="document-analysis-meta">
                  <span>
                    분석 상태:
                    <strong>{{
                      document.analysisStatus || '상태 없음'
                    }}</strong>
                  </span>

                  <span v-if="document.riskLevel">
                    위험도:
                    <strong>{{ document.riskLevel }}</strong>
                  </span>

                  <span v-if="document.analysisModel">
                    모델:
                    <strong>{{ document.analysisModel }}</strong>
                  </span>

                  <span v-if="document.analysisMode">
                    모드:
                    <strong>{{ document.analysisMode }}</strong>
                  </span>
                </div>

                <p v-if="document.keywords" class="document-keywords">
                  Keywords: {{ document.keywords }}
                </p>

                <p v-if="document.nextAction" class="document-next-action">
                  Next Action: {{ document.nextAction }}
                </p>

                <small v-if="document.analyzedAt">
                  분석 시각: {{ document.analyzedAt }}
                </small>
              </article>

              <p
                v-if="taskDetail.recentDocuments.length === 0"
                class="empty-panel"
              >
                아직 이 Task에 연결된 문서가 없습니다. 위 업로드 영역에서 업무
                관련 파일을 등록하세요.
              </p>
            </div>

            <div v-else-if="activeTab === 'changes'" class="list-panel">
              <div class="task-git-header">
                <div>
                  <strong>최근 Git 변경사항</strong>
                  <p>
                    현재는 Task 직접 매핑 전 단계이므로 최근 commit 5개를
                    표시합니다. 이후 task_git_links를 통해 업무별 변경사항으로
                    전환합니다.
                  </p>
                </div>

                <button
                  type="button"
                  class="task-mini-button"
                  :disabled="isGitLoading"
                  @click="fetchRecentGitCommits"
                >
                  {{ isGitLoading ? '불러오는 중...' : '새로고침' }}
                </button>
              </div>

              <div v-if="isGitLoading" class="empty-panel">
                Git 변경사항을 불러오는 중입니다.
              </div>

              <div v-else-if="gitErrorMessage" class="empty-panel error">
                {{ gitErrorMessage }}
              </div>

              <template v-else-if="recentGitCommits.length > 0">
                <article
                  v-for="commit in recentGitCommits"
                  :key="commit.hash"
                  class="linked-item git-linked-item"
                >
                  <div class="git-linked-header">
                    <span>{{ commit.shortHash }}</span>
                    <small>{{ commit.branchName }}</small>
                  </div>

                  <strong>{{ commit.message }}</strong>
                  <p>
                    {{ commit.authorName }}
                    <span v-if="commit.authorEmail">
                      · {{ commit.authorEmail }}
                    </span>
                  </p>
                  <small>{{ commit.committedAt }}</small>
                </article>
              </template>

              <template v-else>
                <article
                  v-for="commit in taskDetail.recentCommits"
                  :key="commit.id"
                  class="linked-item"
                >
                  <strong>{{ commit.message }}</strong>
                  <p>{{ commit.summary || commit.commitHash }}</p>
                  <small>{{ commit.authorName || '작성자 미상' }}</small>
                </article>

                <p
                  v-if="taskDetail.recentCommits.length === 0"
                  class="empty-panel"
                >
                  아직 연결된 Git 변경사항이 없습니다. 이후 commit 수집과 Task
                  연결 기능이 추가되면 이 영역에 업무별 변경 이력이 표시됩니다.
                </p>
              </template>
            </div>

            <div v-else-if="activeTab === 'deliverables'" class="list-panel">
              <article
                v-for="deliverable in taskDetail.recentDeliverables"
                :key="deliverable.id"
                class="linked-item"
              >
                <strong>{{ deliverable.title }}</strong>
                <p>{{ deliverable.fileUrl || '파일 경로가 없습니다.' }}</p>
                <small>{{
                  deliverable.submittedByName || '제출자 미상'
                }}</small>
              </article>

              <p
                v-if="taskDetail.recentDeliverables.length === 0"
                class="empty-panel"
              >
                아직 등록된 산출물이 없습니다. 이후 문서 업로드와 산출물 제출
                기능을 연결합니다.
              </p>
            </div>

            <div v-else class="list-panel">
              <article
                v-for="activity in taskDetail.recentActivities"
                :key="activity.id"
                class="linked-item"
              >
                <strong>{{ activity.type }}</strong>
                <p>{{ activity.message }}</p>
                <small>{{ activity.actorName || '시스템' }}</small>
              </article>

              <p
                v-if="taskDetail.recentActivities.length === 0"
                class="empty-panel"
              >
                아직 활동 이력이 없습니다. 상태 변경, 문서 업로드, commit 연결
                이력이 누적되면 이 영역에 표시됩니다.
              </p>
            </div>
          </section>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.task-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.58);
  padding: 32px;
}

.task-modal {
  width: min(1040px, 100%);
  max-height: min(860px, calc(100vh - 64px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 28px;
  background: #f8fafc;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.32);
}

.task-modal-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  padding: 24px 28px;
}

.task-modal-eyebrow {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.task-modal-header h2 {
  margin: 0;
  color: #172033;
  font-size: 24px;
}

.task-modal-subtitle {
  margin: 6px 0 0;
  color: #667085;
  font-size: 14px;
}

.task-modal-close {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 999px;
  background: #f2f4f7;
  color: #172033;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.task-modal-state {
  padding: 40px;
  color: #475467;
}

.task-modal-state.error {
  color: #b42318;
}

.task-modal-content {
  overflow-y: auto;
  padding: 24px 28px 28px;
}

.task-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
  gap: 20px;
}

.task-hero-main,
.task-hero-meta,
.detail-card,
.task-summary-grid article,
.linked-item,
.upload-card {
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: white;
  box-shadow: 0 12px 30px rgba(16, 24, 40, 0.06);
}

.task-hero-main {
  padding: 24px;
}

.task-hero-main h3 {
  margin: 14px 0 10px;
  color: #172033;
  font-size: 26px;
}

.task-hero-main p {
  margin: 0;
  color: #667085;
  line-height: 1.7;
}

.status-badge {
  display: inline-flex;
  border-radius: 999px;
  background: #eef4ff;
  color: #2563eb;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 900;
}

.status-badge.DONE,
.status-badge.COMPLETED {
  background: #ecfdf3;
  color: #027a48;
}

.status-badge.IN_PROGRESS {
  background: #eff6ff;
  color: #2563eb;
}

.status-badge.REVIEW {
  background: #fffaeb;
  color: #b54708;
}

.status-badge.OVERDUE {
  background: #fff1f3;
  color: #c01048;
}

.task-hero-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 20px;
}

.task-hero-meta div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-hero-meta span,
.detail-card span,
.task-summary-grid span {
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.task-hero-meta strong {
  color: #172033;
  font-size: 14px;
}

.task-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: 20px;
}

.task-summary-grid article {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
}

.task-summary-grid strong {
  color: #172033;
  font-size: 26px;
}

.task-tabs {
  display: flex;
  gap: 8px;
  margin-top: 22px;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
}

.task-tabs button {
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: #667085;
  cursor: pointer;
  padding: 12px 14px;
  font-weight: 900;
  white-space: nowrap;
}

.task-tabs button.active {
  border-bottom-color: #2563eb;
  color: #2563eb;
}

.task-tab-panel {
  padding-top: 20px;
}

.overview-panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.detail-card {
  padding: 20px;
}

.detail-card p {
  margin: 8px 0 0;
  color: #475467;
  line-height: 1.7;
}

.list-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.linked-item {
  padding: 18px;
}

.linked-item strong {
  color: #172033;
}

.linked-item p {
  margin: 8px 0;
  color: #475467;
}

.linked-item small {
  color: #667085;
}

.empty-panel {
  border: 1px dashed #cbd5e1;
  border-radius: 18px;
  background: white;
  color: #667085;
  padding: 24px;
  line-height: 1.7;
}

.empty-panel.error {
  color: #b42318;
  border-color: #fecdd3;
  background: #fff1f2;
}

.upload-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
}

.upload-card-header strong {
  color: #172033;
  font-size: 16px;
}

.upload-card-header p {
  margin: 6px 0 0;
  color: #667085;
  line-height: 1.6;
}

.upload-form-grid {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 12px;
}

.upload-card label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #344054;
  font-size: 14px;
  font-weight: 800;
}

.upload-card input,
.upload-card select,
.upload-card textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d0d5dd;
  border-radius: 12px;
  color: #172033;
  font: inherit;
  padding: 10px 12px;
}

.upload-card textarea {
  resize: vertical;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
}

.upload-error {
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fff7f7;
  color: #b42318;
  padding: 10px 12px;
  font-size: 14px;
}

.task-git-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: white;
}

.task-git-header strong {
  color: #172033;
  font-size: 16px;
}

.task-git-header p {
  margin: 6px 0 0;
  color: #667085;
  line-height: 1.6;
}

.task-mini-button {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid #d0d5dd;
  border-radius: 10px;
  background: white;
  color: #344054;
  cursor: pointer;
  font-weight: 900;
}

.task-mini-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.document-analysis-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.document-analysis-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.document-analysis-header > div {
  min-width: 0;
}

.document-analysis-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.document-analysis-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  padding: 5px 9px;
  font-size: 12px;
}

.document-analysis-meta strong {
  color: #172033;
}

.document-keywords,
.document-next-action {
  margin: 0;
  border-radius: 12px;
  background: #f8fafc;
  color: #475467;
  padding: 10px 12px;
  line-height: 1.6;
}

.git-linked-item {
  border-color: #dbeafe;
  background: #f8fbff;
}

.git-linked-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.git-linked-header span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 12px;
  font-weight: 900;
}

.git-linked-header small {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 900;
}

@media (max-width: 800px) {
  .task-modal-overlay {
    padding: 16px;
  }

  .task-hero {
    grid-template-columns: 1fr;
  }

  .task-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .task-hero-meta {
    grid-template-columns: 1fr;
  }

  .task-git-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .upload-form-grid {
    grid-template-columns: 1fr;
  }

  .document-analysis-header {
    flex-direction: column;
  }
}
</style>
