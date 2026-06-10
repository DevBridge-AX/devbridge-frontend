<script setup lang="ts">
type SummaryItem = {
  label: string
  value: string | number
  description: string
}

type TaskItem = {
  taskId: string
  title: string
  status: string
  assigneeName: string
  dueDate: string
}

type GitCommitItem = {
  commitId: string
  commitHash: string
  commitMessage: string
  authorName: string
  pushedAt: string
}

type DocumentItem = {
  documentId: string
  title: string
  sourceName: string
  createdAt: string
}

const summaryItems: SummaryItem[] = [
  {
    label: '전체 업무',
    value: 4,
    description: '등록된 전체 업무 수',
  },
  {
    label: '진행 중',
    value: 1,
    description: '현재 진행 중인 업무',
  },
  {
    label: '완료',
    value: 1,
    description: '완료된 업무',
  },
  {
    label: '지연',
    value: 1,
    description: '마감일 기준 지연 업무',
  },
  {
    label: '완료율',
    value: '25%',
    description: '전체 업무 대비 완료 비율',
  },
  {
    label: '멤버',
    value: 2,
    description: '워크스페이스 참여 인원',
  },
]

const recentTasks: TaskItem[] = [
  {
    taskId: 'task-001',
    title: 'Workspace Dashboard Summary API 구현',
    status: 'DONE',
    assigneeName: '김은정',
    dueDate: '2026-06-08',
  },
  {
    taskId: 'task-002',
    title: 'Workspace Dashboard Detail API 구현',
    status: 'IN_PROGRESS',
    assigneeName: '김은정',
    dueDate: '2026-06-09',
  },
]

const delayedTasks: TaskItem[] = [
  {
    taskId: 'task-003',
    title: '프론트 대시보드 API 연결 준비',
    status: 'DELAYED',
    assigneeName: '미지정',
    dueDate: '2026-06-10',
  },
]

const recentGitCommits: GitCommitItem[] = [
  {
    commitId: 'commit-001',
    commitHash: 'a1b2c3d',
    commitMessage: 'feat: add workspace dashboard detail API',
    authorName: '김은정',
    pushedAt: '2026-06-09 23:10',
  },
  {
    commitId: 'commit-002',
    commitHash: 'e4f5g6h',
    commitMessage: 'feat: implement workspace dashboard summary service',
    authorName: '김은정',
    pushedAt: '2026-06-08 23:20',
  },
]

const recentDocuments: DocumentItem[] = [
  {
    documentId: 'doc-001',
    title: '대시보드 API 명세',
    sourceName: 'DevBridge 기획 문서',
    createdAt: '2026-06-09',
  },
  {
    documentId: 'doc-002',
    title: 'AI 데이터 파이프라인 정리',
    sourceName: '프로젝트 기술 문서',
    createdAt: '2026-06-09',
  },
]

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    ASSIGNED: '배정',
    IN_PROGRESS: '진행 중',
    DONE: '완료',
    DELAYED: '지연',
  }

  return statusMap[status] ?? status
}
</script>

<template>
  <main class="dashboard-page">
    <section class="dashboard-hero">
      <div>
        <p class="eyebrow">Workspace Dashboard</p>
        <h1>DevBridge AX 대시보드</h1>
        <p class="hero-description">
          워크스페이스의 업무 진행 현황, 지연 업무, Git 변경사항, 문서
          업데이트를 한눈에 확인합니다.
        </p>
      </div>

      <button class="primary-button" type="button">
        AI에게 현재 상태 요약 요청
      </button>
    </section>

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

        <ul class="item-list">
          <li v-for="task in recentTasks" :key="task.taskId" class="item-card">
            <div>
              <strong>{{ task.title }}</strong>
              <p>담당자 {{ task.assigneeName }} · 마감 {{ task.dueDate }}</p>
            </div>
            <span class="status-badge">{{ getStatusLabel(task.status) }}</span>
          </li>
        </ul>
      </article>

      <article class="panel danger-panel">
        <div class="panel-header">
          <h2>지연 업무</h2>
          <span>{{ delayedTasks.length }}건</span>
        </div>

        <ul class="item-list">
          <li v-for="task in delayedTasks" :key="task.taskId" class="item-card">
            <div>
              <strong>{{ task.title }}</strong>
              <p>담당자 {{ task.assigneeName }} · 마감 {{ task.dueDate }}</p>
            </div>
            <span class="status-badge danger">{{
              getStatusLabel(task.status)
            }}</span>
          </li>
        </ul>
      </article>

      <article class="panel">
        <div class="panel-header">
          <h2>최근 Git Commit</h2>
          <span>{{ recentGitCommits.length }}건</span>
        </div>

        <ul class="item-list">
          <li
            v-for="commit in recentGitCommits"
            :key="commit.commitId"
            class="item-card vertical"
          >
            <strong>{{ commit.commitMessage }}</strong>
            <p>
              {{ commit.commitHash }} · {{ commit.authorName }} ·
              {{ commit.pushedAt }}
            </p>
          </li>
        </ul>
      </article>

      <article class="panel">
        <div class="panel-header">
          <h2>최근 문서</h2>
          <span>{{ recentDocuments.length }}건</span>
        </div>

        <ul class="item-list">
          <li
            v-for="document in recentDocuments"
            :key="document.documentId"
            class="item-card vertical"
          >
            <strong>{{ document.title }}</strong>
            <p>{{ document.sourceName }} · {{ document.createdAt }}</p>
          </li>
        </ul>
      </article>
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
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
