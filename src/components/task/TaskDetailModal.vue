<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { taskService } from '@/services/taskService'
import type { TaskDetail } from '@/api/taskApi'

const props = defineProps<{
  taskId: string | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const activeTab = ref<
  'overview' | 'documents' | 'changes' | 'deliverables' | 'activity'
>('overview')
const isLoading = ref(false)
const errorMessage = ref('')
const taskDetail = ref<TaskDetail | null>(null)

const statusLabel = computed(() => {
  const status = taskDetail.value?.status

  if (status === 'DONE') return '완료'
  if (status === 'IN_PROGRESS') return '진행 중'
  if (status === 'OVERDUE') return '지연'
  if (status === 'ASSIGNED') return '배정'

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

function closeModal() {
  emit('close')
}

function handleOverlayClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}

watch(
  () => [props.taskId, props.isOpen],
  () => {
    if (props.isOpen) {
      activeTab.value = 'overview'
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
                  '등록된 업무 설명이 없습니다. 관련 문서와 변경 이력을 연결하면 업무 맥락을 더 명확히 확인할 수 있습니다.'
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
              <strong>{{ taskDetail.commitCount }}</strong>
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
              @click="activeTab = 'overview'"
            >
              Overview
            </button>
            <button
              type="button"
              :class="{ active: activeTab === 'documents' }"
              @click="activeTab = 'documents'"
            >
              Documents
            </button>
            <button
              type="button"
              :class="{ active: activeTab === 'changes' }"
              @click="activeTab = 'changes'"
            >
              Recent Changes
            </button>
            <button
              type="button"
              :class="{ active: activeTab === 'deliverables' }"
              @click="activeTab = 'deliverables'"
            >
              Deliverables
            </button>
            <button
              type="button"
              :class="{ active: activeTab === 'activity' }"
              @click="activeTab = 'activity'"
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
                    '아직 AI 분석 요약이 없습니다. Day 3에서 문서 분석과 AI Engine 연결 후 이 영역에 요약이 표시됩니다.'
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
              <article
                v-for="document in taskDetail.recentDocuments"
                :key="document.id"
                class="linked-item"
              >
                <strong>{{ document.title }}</strong>
                <p>{{ document.summary || '요약 정보가 없습니다.' }}</p>
                <small>{{ document.analysisStatus || '분석 상태 없음' }}</small>
              </article>

              <p
                v-if="taskDetail.recentDocuments.length === 0"
                class="empty-panel"
              >
                아직 연결된 문서가 없습니다. Day 2에서 문서 업로드와 Task 연결
                기능을 추가합니다.
              </p>
            </div>

            <div v-else-if="activeTab === 'changes'" class="list-panel">
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
                아직 연결된 Git 변경사항이 없습니다. Day 4에서 commit 수집과
                Task 연결 기능을 추가합니다.
              </p>
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
                기능으로 연결됩니다.
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
                아직 활동 이력이 없습니다. 상태 변경, 문서 연결, commit 연결
                이력이 이곳에 표시됩니다.
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
.linked-item {
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

.status-badge.DONE {
  background: #ecfdf3;
  color: #027a48;
}

.status-badge.IN_PROGRESS {
  background: #eff6ff;
  color: #2563eb;
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
}
</style>
