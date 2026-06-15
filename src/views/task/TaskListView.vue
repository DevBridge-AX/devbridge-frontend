<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { taskService } from '@/services/taskService'
import type { Task } from '@/api/taskApi'
import AppLayout from '@/layouts/AppLayout.vue'
import TaskDetailModal from '@/components/task/TaskDetailModal.vue'
import '@/assets/styles/task-list.css'

const route = useRoute()
const router = useRouter()

const tasks = ref<Task[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const selectedStatus = ref('ALL')

const selectedTaskId = ref<string | null>(null)
const isTaskDetailModalOpen = ref(false)

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
  () =>
    tasks.value.filter(
      (task) => task.status === 'DONE' || task.status === 'COMPLETED',
    ).length,
)

const overdueCount = computed(() => {
  const now = new Date()

  return tasks.value.filter((task) => {
    if (
      !task.dueDate ||
      task.status === 'DONE' ||
      task.status === 'COMPLETED'
    ) {
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
      if (
        !task.dueDate ||
        task.status === 'DONE' ||
        task.status === 'COMPLETED'
      ) {
        return false
      }

      return new Date(task.dueDate) < now
    })
  }

  if (selectedStatus.value === 'DONE') {
    return tasks.value.filter(
      (task) => task.status === 'DONE' || task.status === 'COMPLETED',
    )
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
  } catch (error: unknown) {
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

function openTaskDetail(taskId: string) {
  selectedTaskId.value = taskId
  isTaskDetailModalOpen.value = true
}

function closeTaskDetail() {
  isTaskDetailModalOpen.value = false
  selectedTaskId.value = null
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
    'DONE',
    'COMPLETED',
    'CANCELLED',
    'OVERDUE',
  ]

  if (!availableStatuses.includes(status)) {
    selectedStatus.value = 'ALL'
    return
  }

  selectedStatus.value = status === 'COMPLETED' ? 'DONE' : status
}

function formatDate(value: string | null) {
  if (!value) {
    return '미정'
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
    DONE: '완료',
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
    DONE: 'done',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  }

  return statusClassMap[status] ?? 'default'
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.status === 'DONE' || task.status === 'COMPLETED') {
    return false
  }

  return new Date(task.dueDate) < new Date()
}

onMounted(() => {
  applyStatusQuery()
  void fetchTasks()
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
    selectedTaskId.value = null
    isTaskDetailModalOpen.value = false
    applyStatusQuery()
    void fetchTasks()
  },
)
</script>

<template>
  <AppLayout>
    <main class="task-list-page-shell">
      <section class="task-list-page">
        <header class="task-list-hero">
          <div>
            <p class="task-list-eyebrow">Task</p>
            <h1>업무 관리</h1>
            <p class="task-list-description">
              현재 Workspace에서 진행되는 업무를 확인하고, 담당자·마감일·진행
              상태를 추적합니다. 업무 항목을 클릭하면 상세 정보, 관련 문서, 변경
              사항, 산출물, 활동 이력을 확인할 수 있습니다.
            </p>
          </div>

          <div class="task-list-header-actions">
            <button
              type="button"
              class="task-list-secondary-button"
              @click="goToDashboard"
            >
              대시보드로 이동
            </button>
            <button
              type="button"
              class="task-list-primary-button"
              @click="fetchTasks"
            >
              새로고침
            </button>
          </div>
        </header>

        <section class="task-list-summary-grid">
          <button
            type="button"
            class="task-list-summary-card"
            :class="{ active: selectedStatus === 'ALL' }"
            @click="setStatusFilter('ALL')"
          >
            <span>전체 업무</span>
            <strong>{{ totalCount }}</strong>
          </button>

          <button
            type="button"
            class="task-list-summary-card"
            :class="{ active: selectedStatus === 'ASSIGNED' }"
            @click="setStatusFilter('ASSIGNED')"
          >
            <span>배정</span>
            <strong>{{ assignedCount }}</strong>
          </button>

          <button
            type="button"
            class="task-list-summary-card"
            :class="{ active: selectedStatus === 'IN_PROGRESS' }"
            @click="setStatusFilter('IN_PROGRESS')"
          >
            <span>진행 중</span>
            <strong>{{ inProgressCount }}</strong>
          </button>

          <button
            type="button"
            class="task-list-summary-card"
            :class="{ active: selectedStatus === 'DONE' }"
            @click="setStatusFilter('DONE')"
          >
            <span>완료</span>
            <strong>{{ completedCount }}</strong>
          </button>

          <button
            type="button"
            class="task-list-summary-card warning"
            :class="{ active: selectedStatus === 'OVERDUE' }"
            @click="setStatusFilter('OVERDUE')"
          >
            <span>지연 가능</span>
            <strong>{{ overdueCount }}</strong>
          </button>
        </section>

        <section class="task-list-content-card">
          <div class="task-list-content-header">
            <div>
              <h2>Task 목록</h2>
              <p>
                선택한 Workspace 기준으로 조회된 업무입니다. 항목을 클릭하면
                공통 Task 상세 모달에서 업무 맥락과 연결 데이터를 확인합니다.
              </p>
            </div>

            <span class="task-list-count-badge">
              {{ filteredTasks.length }}개 표시
            </span>
          </div>

          <div v-if="isLoading" class="task-list-state-box">
            업무 목록을 불러오는 중입니다.
          </div>

          <div v-else-if="errorMessage" class="task-list-state-box error">
            {{ errorMessage }}
          </div>

          <div
            v-else-if="filteredTasks.length === 0"
            class="task-list-state-box"
          >
            조건에 맞는 업무가 없습니다.
          </div>

          <div v-else class="task-list-items">
            <article
              v-for="task in filteredTasks"
              :key="task.id"
              class="task-list-item"
              :class="{ overdue: isOverdue(task) }"
              role="button"
              tabindex="0"
              @click="openTaskDetail(task.id)"
              @keydown.enter="openTaskDetail(task.id)"
            >
              <div class="task-list-title-row">
                <div>
                  <h3>{{ task.title }}</h3>
                  <p class="task-list-description-text">
                    {{ task.description || '설명 없음' }}
                  </p>
                </div>

                <div class="task-list-badge-group">
                  <span v-if="isOverdue(task)" class="task-list-overdue-badge">
                    지연 가능
                  </span>
                  <span
                    class="task-list-status-badge"
                    :class="getStatusClass(task.status)"
                  >
                    {{ getStatusLabel(task.status) }}
                  </span>
                </div>
              </div>

              <dl class="task-list-meta">
                <div>
                  <dt>요청자</dt>
                  <dd>{{ task.requesterId }}</dd>
                </div>
                <div>
                  <dt>담당자</dt>
                  <dd>{{ task.assigneeId || '미지정' }}</dd>
                </div>
                <div>
                  <dt>마감일</dt>
                  <dd>{{ formatDate(task.dueDate) }}</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>
      </section>
    </main>

    <TaskDetailModal
      :task-id="selectedTaskId"
      :is-open="isTaskDetailModalOpen"
      @close="closeTaskDetail"
    />
  </AppLayout>
</template>
