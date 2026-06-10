<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { dashboardService } from '@/services/dashboardService'
import type {
  WorkspaceDashboardSummary,
  WorkspaceDashboardDetail,
  DashboardTaskItem,
  DashboardGitCommitItem,
  DashboardDocumentItem,
} from '@/api/dashboardApi'

type SummaryItem = {
  label: string
  value: string | number
  description: string
}

const TEMP_WORKSPACE_ID = 'ws001'

const isLoading = ref(false)
const errorMessage = ref('')
const summary = ref<WorkspaceDashboardSummary | null>(null)
const detail = ref<WorkspaceDashboardDetail | null>(null)

const summaryItems = computed<SummaryItem[]>(() => {
  if (!summary.value) {
    return []
  }

  return [
    {
      label: '전체 업무',
      value: summary.value.totalTaskCount,
      description: '등록된 전체 업무 수',
    },
    {
      label: '배정 업무',
      value: summary.value.assignedTaskCount,
      description: '담당자에게 배정된 업무',
    },
    {
      label: '진행 중',
      value: summary.value.inProgressTaskCount,
      description: '현재 진행 중인 업무',
    },
    {
      label: '완료',
      value: summary.value.doneTaskCount,
      description: '완료된 업무',
    },
    {
      label: '지연',
      value: summary.value.delayedTaskCount,
      description: '마감일 기준 지연된 업무',
    },
    {
      label: '완료율',
      value: `${summary.value.progressRate}%`,
      description: '전체 업무 대비 완료 비율',
    },
    {
      label: '멤버',
      value: summary.value.memberCount,
      description: '워크스페이스 참여 인원',
    },
  ]
})

const recentTasks = computed<DashboardTaskItem[]>(() => {
  return detail.value?.recentTasks ?? []
})

const delayedTasks = computed<DashboardTaskItem[]>(() => {
  return detail.value?.delayedTasks ?? []
})

const recentGitCommits = computed<DashboardGitCommitItem[]>(() => {
  return detail.value?.recentGitCommits ?? []
})

const recentDocuments = computed<DashboardDocumentItem[]>(() => {
  return detail.value?.recentDocuments ?? []
})

const hasDashboardData = computed(() => {
  return summary.value !== null && detail.value !== null
})

const fetchDashboardData = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const dashboardData =
      await dashboardService.getDashboardData(TEMP_WORKSPACE_ID)

    summary.value = dashboardData.summary
    detail.value = dashboardData.detail
  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMessage.value = error.message
      return
    }

    errorMessage.value = '대시보드 데이터를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    ASSIGNED: '배정',
    IN_PROGRESS: '진행 중',
    DONE: '완료',
    DELAYED: '지연',
  }

  return statusMap[status] ?? status
}

const formatDate = (value: string | null) => {
  if (!value) {
    return '미정'
  }

  return value.replace('T', ' ').slice(0, 16)
}

onMounted(() => {
  void fetchDashboardData()
})
</script>

<template>
  <main class="dashboard-page">
    <section class="dashboard-hero">
      <div>
        <p class="eyebrow">Workspace Dashboard</p>
        <h1>{{ summary?.workspaceName ?? 'DevBridge AX 대시보드' }}</h1>
        <p class="hero-description">
          워크스페이스의 업무 진행 현황, 지연 업무, Git 변경사항, 문서
          업데이트를 한눈에 확인합니다.
        </p>
      </div>

      <button class="primary-button" type="button">
        AI에게 현재 상태 요약 요청
      </button>
    </section>

    <section v-if="isLoading" class="state-box">
      대시보드 데이터를 불러오는 중입니다.
    </section>

    <section v-else-if="errorMessage" class="state-box error">
      <strong>데이터 조회 실패</strong>
      <p>{{ errorMessage }}</p>
      <button class="retry-button" type="button" @click="fetchDashboardData">
        다시 시도
      </button>
    </section>

    <template v-else-if="hasDashboardData">
      <section class="summary-grid" aria-label="dashboard summary">
        <article
          v-for="item in summaryItems"
          :key="item.label"
          class="summary-card"
        >
          <p class="summary-label">{{ item.label }}</p>
          <strong class="summary-value">{{ item.value }}</strong>
          <span class="summary-description">{{ item.description }}</span>
        </article>
      </section>

      <section class="dashboard-content">
        <article class="panel">
          <div class="panel-header">
            <h2>최근 업무</h2>
            <span>{{ recentTasks.length }}건</span>
          </div>

          <p v-if="recentTasks.length === 0" class="empty-text">
            표시할 최근 업무가 없습니다.
          </p>

          <ul v-else class="item-list">
            <li
              v-for="task in recentTasks"
              :key="task.taskId"
              class="item-card"
            >
              <div>
                <strong>{{ task.title }}</strong>
                <p>
                  담당자 {{ task.assigneeName }} · 마감
                  {{ formatDate(task.dueDate) }}
                </p>
              </div>
              <span class="status-badge">{{
                getStatusLabel(task.status)
              }}</span>
            </li>
          </ul>
        </article>

        <article class="panel danger-panel">
          <div class="panel-header">
            <h2>지연 업무</h2>
            <span>{{ delayedTasks.length }}건</span>
          </div>

          <p v-if="delayedTasks.length === 0" class="empty-text">
            지연된 업무가 없습니다.
          </p>

          <ul v-else class="item-list">
            <li
              v-for="task in delayedTasks"
              :key="task.taskId"
              class="item-card"
            >
              <div>
                <strong>{{ task.title }}</strong>
                <p>
                  담당자 {{ task.assigneeName }} · 마감
                  {{ formatDate(task.dueDate) }}
                </p>
              </div>
              <span class="status-badge danger">
                {{ getStatusLabel(task.status) }}
              </span>
            </li>
          </ul>
        </article>

        <article class="panel">
          <div class="panel-header">
            <h2>최근 Git Commit</h2>
            <span>{{ recentGitCommits.length }}건</span>
          </div>

          <p v-if="recentGitCommits.length === 0" class="empty-text">
            표시할 Git Commit이 없습니다.
          </p>

          <ul v-else class="item-list">
            <li
              v-for="commit in recentGitCommits"
              :key="commit.commitId"
              class="item-card vertical"
            >
              <strong>{{ commit.commitMessage }}</strong>
              <p>
                {{ commit.commitHash }} · {{ commit.authorName }} ·
                {{ formatDate(commit.pushedAt) }}
              </p>
            </li>
          </ul>
        </article>

        <article class="panel">
          <div class="panel-header">
            <h2>최근 문서</h2>
            <span>{{ recentDocuments.length }}건</span>
          </div>

          <p v-if="recentDocuments.length === 0" class="empty-text">
            표시할 문서가 없습니다.
          </p>

          <ul v-else class="item-list">
            <li
              v-for="document in recentDocuments"
              :key="document.documentId"
              class="item-card vertical"
            >
              <strong>{{ document.title }}</strong>
              <p>
                {{ document.sourceName }} · {{ formatDate(document.createdAt) }}
              </p>
            </li>
          </ul>
        </article>
      </section>
    </template>

    <section v-else class="state-box">
      표시할 대시보드 데이터가 없습니다.
    </section>
  </main>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  padding: 40px;
  background: #f5f7fb;
  color: #172033;
}

.dashboard-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 32px;
  border-radius: 24px;
  background: linear-gradient(135deg, #1f2a44, #334d8f);
  color: white;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.78;
}

.dashboard-hero h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
}

.hero-description {
  max-width: 680px;
  margin: 12px 0 0;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.82);
}

.primary-button {
  flex-shrink: 0;
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  background: white;
  color: #263b70;
  font-weight: 700;
  cursor: pointer;
}

.state-box {
  margin-top: 24px;
  padding: 24px;
  border-radius: 18px;
  background: white;
  color: #667085;
  box-shadow: 0 12px 30px rgba(23, 32, 51, 0.08);
}

.state-box.error {
  color: #d92d20;
  border: 1px solid #ffd6d6;
}

.state-box p {
  margin: 8px 0 0;
}

.retry-button {
  margin-top: 16px;
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  background: #d92d20;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.summary-card {
  padding: 20px;
  border-radius: 18px;
  background: white;
  box-shadow: 0 12px 30px rgba(23, 32, 51, 0.08);
}

.summary-label {
  margin: 0 0 12px;
  color: #667085;
  font-size: 14px;
}

.summary-value {
  display: block;
  font-size: 30px;
  color: #172033;
}

.summary-description {
  display: block;
  margin-top: 8px;
  color: #8a94a6;
  font-size: 13px;
  line-height: 1.4;
}

.dashboard-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.panel {
  padding: 24px;
  border-radius: 22px;
  background: white;
  box-shadow: 0 12px 30px rgba(23, 32, 51, 0.08);
}

.danger-panel {
  border: 1px solid #ffd6d6;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
}

.panel-header span {
  color: #667085;
  font-size: 14px;
}

.empty-text {
  margin: 0;
  color: #8a94a6;
  font-size: 14px;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  background: #f8fafc;
}

.item-card.vertical {
  align-items: flex-start;
  flex-direction: column;
  gap: 6px;
}

.item-card strong {
  color: #172033;
  font-size: 15px;
}

.item-card p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
}

.status-badge {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 6px 10px;
  background: #e7efff;
  color: #2d5fd5;
  font-size: 12px;
  font-weight: 700;
}

.status-badge.danger {
  background: #fff0f0;
  color: #d92d20;
}

@media (max-width: 1400px) {
  .summary-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .dashboard-page {
    padding: 24px;
  }

  .dashboard-hero {
    flex-direction: column;
  }

  .summary-grid,
  .dashboard-content {
    grid-template-columns: 1fr;
  }
}
</style>
