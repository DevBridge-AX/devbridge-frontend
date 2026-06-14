<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { taskService } from '@/services/taskService'
import type { Task } from '@/api/taskApi'
import AppLayout from '@/layouts/AppLayout.vue'

const route = useRoute()
const router = useRouter()

const tasks = ref<Task[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const selectedStatus = ref('ALL')
const selectedTask = ref<Task | null>(null)

const workspaceId = computed(() => {
  const value = route.params.workspaceId
  return Array.isArray(value) ? value[0] : value
})

const totalCount = computed(() => tasks.value.length)

const assignedCount = computed(
  () => tasks.value.filter((task) => task.status === 'ASSIGNED').length,
)

const inProgressCount = computed(
  () => tasks.value.filter((task) => task.status === 'IN_PROGRESS').length,
)

const completedCount = computed(
  () => tasks.value.filter((task) => task.status === 'COMPLETED').length,
)

const overdueCount = computed(() => {
  const now = new Date()

  return tasks.value.filter((task) => {
    if (!task.dueDate || task.status === 'COMPLETED') {
      return false
    }

    return new Date(task.dueDate) < now
  }).length
})

const filteredTasks = computed(() => {
  if (selectedStatus.value === 'ALL') {
    return tasks.value
  }

  if (selectedStatus.value === 'OVERDUE') {
    const now = new Date()

    return tasks.value.filter((task) => {
      if (!task.dueDate || task.status === 'COMPLETED') {
        return false
      }

      return new Date(task.dueDate) < now
    })
  }

  return tasks.value.filter((task) => task.status === selectedStatus.value)
})

async function fetchTasks() {
  if (!workspaceId.value) {
    errorMessage.value = '워크스페이스 정보가 없습니다.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    tasks.value = await taskService.getTasksByWorkspace(workspaceId.value)
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : '업무 목록을 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

function goToDashboard() {
  if (!workspaceId.value) {
    return
  }

  router.push(`/workspaces/${workspaceId.value}/dashboard`)
}

function openTaskDetail(task: Task) {
  selectedTask.value = task
}

function closeTaskDetail() {
  selectedTask.value = null
}

function setStatusFilter(status: string) {
  selectedStatus.value = status
}

function applyStatusQuery() {
  const status = route.query.status

  if (typeof status !== 'string') {
    selectedStatus.value = 'ALL'
    return
  }

  const availableStatuses = [
    'ALL',
    'ASSIGNED',
    'IN_PROGRESS',
    'REVIEW',
    'COMPLETED',
    'CANCELLED',
    'OVERDUE',
  ]

  selectedStatus.value = availableStatuses.includes(status) ? status : 'ALL'
}

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getStatusLabel(status: string) {
  const statusMap: Record<string, string> = {
    ASSIGNED: '배정',
    IN_PROGRESS: '진행 중',
    REVIEW: '검토',
    COMPLETED: '완료',
    CANCELLED: '취소',
  }

  return statusMap[status] ?? status
}

function getStatusClass(status: string) {
  const statusClassMap: Record<string, string> = {
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in-progress',
    REVIEW: 'review',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  }

  return statusClassMap[status] ?? 'default'
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.status === 'COMPLETED') {
    return false
  }

  return new Date(task.dueDate) < new Date()
}

onMounted(() => {
  applyStatusQuery()
  fetchTasks()
})

watch(
  () => route.query.status,
  () => {
    applyStatusQuery()
  },
)

watch(
  () => workspaceId.value,
  () => {
    selectedTask.value = null
    applyStatusQuery()
    fetchTasks()
  },
)
</script>

<template>
  <AppLayout>
    <main class="page-shell">
      <section class="task-page">
        <header class="hero-section">
          <div>
            <p class="eyebrow">TASK</p>
            <h1>업무 관리</h1>
            <p class="description">
              현재 Workspace에서 진행되는 업무를 확인하고, 담당자·마감일·진행
              상태를 추적합니다.
            </p>
          </div>

          <div class="header-actions">
            <button
              type="button"
              class="secondary-button"
              @click="goToDashboard"
            >
              대시보드로 이동
            </button>
            <button type="button" class="primary-button" @click="fetchTasks">
              새로고침
            </button>
          </div>
        </header>

        <section class="summary-grid">
          <button
            type="button"
            class="summary-card"
            :class="{ active: selectedStatus === 'ALL' }"
            @click="setStatusFilter('ALL')"
          >
            <span>전체 업무</span>
            <strong>{{ totalCount }}</strong>
          </button>

          <button
            type="button"
            class="summary-card"
            :class="{ active: selectedStatus === 'ASSIGNED' }"
            @click="setStatusFilter('ASSIGNED')"
          >
            <span>배정</span>
            <strong>{{ assignedCount }}</strong>
          </button>

          <button
            type="button"
            class="summary-card"
            :class="{ active: selectedStatus === 'IN_PROGRESS' }"
            @click="setStatusFilter('IN_PROGRESS')"
          >
            <span>진행 중</span>
            <strong>{{ inProgressCount }}</strong>
          </button>

          <button
            type="button"
            class="summary-card"
            :class="{ active: selectedStatus === 'COMPLETED' }"
            @click="setStatusFilter('COMPLETED')"
          >
            <span>완료</span>
            <strong>{{ completedCount }}</strong>
          </button>

          <button
            type="button"
            class="summary-card warning"
            :class="{ active: selectedStatus === 'OVERDUE' }"
            @click="setStatusFilter('OVERDUE')"
          >
            <span>지연 가능</span>
            <strong>{{ overdueCount }}</strong>
          </button>
        </section>

        <section class="content-card">
          <div class="content-header">
            <div>
              <h2>Task 목록</h2>
              <p>
                선택한 Workspace 기준으로 조회된 업무입니다. 항목을 클릭하면
                상세 정보를 확인할 수 있습니다.
              </p>
            </div>

            <span class="count-badge"> {{ filteredTasks.length }}개 표시 </span>
          </div>

          <div v-if="isLoading" class="state-box">
            업무 목록을 불러오는 중입니다.
          </div>

          <div v-else-if="errorMessage" class="state-box error">
            {{ errorMessage }}
          </div>

          <div v-else-if="filteredTasks.length === 0" class="state-box">
            조건에 맞는 업무가 없습니다.
          </div>

          <div v-else class="task-list">
            <article
              v-for="task in filteredTasks"
              :key="task.id"
              class="task-item"
              :class="{ overdue: isOverdue(task) }"
              role="button"
              tabindex="0"
              @click="openTaskDetail(task)"
              @keydown.enter="openTaskDetail(task)"
            >
              <div class="task-main">
                <div class="task-title-row">
                  <div>
                    <h3>{{ task.title }}</h3>
                    <p class="task-description">
                      {{ task.description || '설명 없음' }}
                    </p>
                  </div>

                  <div class="badge-group">
                    <span v-if="isOverdue(task)" class="overdue-badge">
                      지연 가능
                    </span>
                    <span
                      class="status-badge"
                      :class="getStatusClass(task.status)"
                    >
                      {{ getStatusLabel(task.status) }}
                    </span>
                  </div>
                </div>

                <dl class="task-meta">
                  <div>
                    <dt>요청자</dt>
                    <dd>{{ task.requesterId }}</dd>
                  </div>
                  <div>
                    <dt>담당자</dt>
                    <dd>{{ task.assigneeId || '-' }}</dd>
                  </div>
                  <div>
                    <dt>마감일</dt>
                    <dd>{{ formatDate(task.dueDate) }}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </div>
        </section>
      </section>
    </main>

    <Teleport to="body">
      <div
        v-if="selectedTask"
        class="modal-backdrop"
        @click.self="closeTaskDetail"
      >
        <section class="task-modal" role="dialog" aria-modal="true">
          <header class="modal-header">
            <div>
              <p class="eyebrow">TASK DETAIL</p>
              <h2>{{ selectedTask.title }}</h2>
            </div>

            <button type="button" class="close-button" @click="closeTaskDetail">
              닫기
            </button>
          </header>

          <div class="modal-status-row">
            <span
              class="status-badge"
              :class="getStatusClass(selectedTask.status)"
            >
              {{ getStatusLabel(selectedTask.status) }}
            </span>
            <span v-if="isOverdue(selectedTask)" class="overdue-badge">
              지연 가능
            </span>
          </div>

          <p class="modal-description">
            {{ selectedTask.description || '등록된 설명이 없습니다.' }}
          </p>

          <dl class="detail-grid">
            <div>
              <dt>Workspace ID</dt>
              <dd>{{ selectedTask.workspaceId }}</dd>
            </div>
            <div>
              <dt>Task ID</dt>
              <dd>{{ selectedTask.id }}</dd>
            </div>
            <div>
              <dt>요청자</dt>
              <dd>{{ selectedTask.requesterId }}</dd>
            </div>
            <div>
              <dt>담당자</dt>
              <dd>{{ selectedTask.assigneeId || '-' }}</dd>
            </div>
            <div>
              <dt>마감일</dt>
              <dd>{{ formatDate(selectedTask.dueDate) }}</dd>
            </div>
            <div>
              <dt>현재 상태</dt>
              <dd>{{ getStatusLabel(selectedTask.status) }}</dd>
            </div>
          </dl>

          <footer class="modal-footer">
            <button
              type="button"
              class="secondary-button"
              @click="closeTaskDetail"
            >
              닫기
            </button>
            <button type="button" class="disabled-button" disabled>
              상태 변경은 이후 단계에서 연결
            </button>
          </footer>
        </section>
      </div>
    </Teleport>
  </AppLayout>
</template>

<style scoped>
.page-shell {
  min-height: calc(100vh - 120px);
  background: #f8fafc;
  padding: 32px 38px;
}

.task-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-section {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  border-radius: 28px;
  background: linear-gradient(135deg, #17203f 0%, #405299 100%);
  color: #ffffff;
  padding: 32px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.14);
}

.eyebrow {
  margin: 0 0 8px;
  color: inherit;
  opacity: 0.74;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero-section h1 {
  margin: 0;
  color: #ffffff;
  font-size: 32px;
  font-weight: 800;
}

.description {
  margin: 10px 0 0;
  max-width: 620px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 15px;
  line-height: 1.6;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.primary-button,
.secondary-button,
.disabled-button,
.close-button {
  border: 0;
  border-radius: 12px;
  padding: 11px 16px;
  font-weight: 800;
  cursor: pointer;
}

.primary-button {
  background: #2563eb;
  color: #ffffff;
}

.secondary-button {
  background: #e2e8f0;
  color: #1e293b;
}

.hero-section .secondary-button {
  background: rgba(255, 255, 255, 0.88);
  color: #1e293b;
}

.hero-section .primary-button {
  background: #ffffff;
  color: #1e293b;
}

.disabled-button {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

.close-button {
  background: #0f172a;
  color: #ffffff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.summary-card:hover,
.summary-card.active {
  transform: translateY(-2px);
  border-color: #93c5fd;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
}

.summary-card span {
  display: block;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.summary-card strong {
  display: block;
  margin-top: 10px;
  color: #0f172a;
  font-size: 28px;
}

.summary-card.warning strong {
  color: #dc2626;
}

.content-card {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.05);
}

.content-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  padding: 22px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.content-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
}

.content-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.count-badge {
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.state-box {
  padding: 48px;
  color: #64748b;
  text-align: center;
}

.state-box.error {
  color: #dc2626;
}

.task-list {
  display: flex;
  flex-direction: column;
}

.task-item {
  padding: 22px 24px;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  transition:
    background 0.16s ease,
    transform 0.16s ease;
}

.task-item:hover {
  background: #f8fafc;
}

.task-item:last-child {
  border-bottom: 0;
}

.task-item.overdue {
  border-left: 4px solid #ef4444;
}

.task-title-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.task-title-row h3 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
}

.badge-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-badge,
.overdue-badge {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.status-badge {
  background: #eff6ff;
  color: #2563eb;
}

.status-badge.assigned {
  background: #eef2ff;
  color: #4f46e5;
}

.status-badge.in-progress {
  background: #ecfeff;
  color: #0891b2;
}

.status-badge.review {
  background: #fef9c3;
  color: #a16207;
}

.status-badge.completed {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.cancelled {
  background: #f1f5f9;
  color: #64748b;
}

.overdue-badge {
  background: #fee2e2;
  color: #dc2626;
}

.task-description {
  margin: 10px 0 16px;
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
}

.task-meta {
  display: flex;
  gap: 28px;
  margin: 0;
}

.task-meta div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-meta dt {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}

.task-meta dd {
  margin: 0;
  color: #334155;
  font-size: 13px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.46);
  backdrop-filter: blur(3px);
}

.task-modal {
  width: min(520px, 100%);
  height: 100%;
  background: #ffffff;
  padding: 30px;
  box-shadow: -20px 0 44px rgba(15, 23, 42, 0.24);
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.modal-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 800;
}

.modal-status-row {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.modal-description {
  margin: 22px 0;
  color: #475569;
  font-size: 15px;
  line-height: 1.7;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin: 0;
}

.detail-grid div {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px;
}

.detail-grid dt {
  margin-bottom: 6px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}

.detail-grid dd {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  word-break: break-all;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 26px;
}

@media (max-width: 960px) {
  .page-shell {
    padding: 24px 20px;
  }

  .hero-section {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .task-title-row {
    flex-direction: column;
  }

  .badge-group {
    justify-content: flex-start;
  }

  .task-meta {
    flex-direction: column;
    gap: 12px;
  }

  .modal-backdrop {
    justify-content: center;
  }

  .task-modal {
    width: 100%;
  }
}
</style>
