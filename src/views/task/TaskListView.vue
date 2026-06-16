<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { taskService } from '@/services/taskService'
import { useAuthStore } from '@/state/authStore'
import type { CreateTaskRequest, Task, UpdateTaskRequest } from '@/api/taskApi'
import AppLayout from '@/layouts/AppLayout.vue'
import TaskDetailModal from '@/components/task/TaskDetailModal.vue'
import '@/assets/styles/task-list.css'

type TaskFormMode = 'create' | 'edit'

type TaskFormState = {
  title: string
  description: string
  assigneeId: string
  dueDate: string
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const tasks = ref<Task[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const selectedStatus = ref('ALL')

const selectedTaskId = ref<string | null>(null)
const isTaskDetailModalOpen = ref(false)

const isTaskFormOpen = ref(false)
const taskFormMode = ref<TaskFormMode>('create')
const editingTaskId = ref<string | null>(null)
const isSavingTask = ref(false)
const formErrorMessage = ref('')

const taskForm = ref<TaskFormState>({
  title: '',
  description: '',
  assigneeId: '',
  dueDate: '',
})

const workspaceId = computed(() => {
  const value = route.params.workspaceId
  return Array.isArray(value) ? value[0] : value
})

const currentUserId = computed(() => authStore.currentUser?.id ?? '')

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

const formTitle = computed(() => {
  return taskFormMode.value === 'create' ? '업무 추가' : '업무 수정'
})

const submitButtonLabel = computed(() => {
  return taskFormMode.value === 'create' ? '업무 생성' : '수정 저장'
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

function resetTaskForm() {
  taskForm.value = {
    title: '',
    description: '',
    assigneeId: '',
    dueDate: '',
  }
  formErrorMessage.value = ''
  editingTaskId.value = null
}

function openCreateTaskForm() {
  taskFormMode.value = 'create'
  resetTaskForm()
  isTaskFormOpen.value = true
}

function openEditTaskForm(task: Task) {
  taskFormMode.value = 'edit'
  editingTaskId.value = task.id
  formErrorMessage.value = ''

  taskForm.value = {
    title: task.title,
    description: task.description ?? '',
    assigneeId: task.assigneeId ?? '',
    dueDate: toDateTimeLocalValue(task.dueDate),
  }

  isTaskFormOpen.value = true
}

function closeTaskForm() {
  if (isSavingTask.value) {
    return
  }

  isTaskFormOpen.value = false
  resetTaskForm()
}

async function submitTaskForm() {
  if (!workspaceId.value) {
    formErrorMessage.value = '워크스페이스 정보가 없습니다.'
    return
  }

  if (!taskForm.value.title.trim()) {
    formErrorMessage.value = '업무 제목을 입력해야 합니다.'
    return
  }

  isSavingTask.value = true
  formErrorMessage.value = ''

  try {
    if (taskFormMode.value === 'create') {
      if (!currentUserId.value) {
        formErrorMessage.value =
          '요청자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.'
        return
      }

      const request: CreateTaskRequest = {
        workspaceId: workspaceId.value,
        requesterId: currentUserId.value,
        assigneeId: normalizeNullableValue(taskForm.value.assigneeId),
        title: taskForm.value.title.trim(),
        description: normalizeNullableValue(taskForm.value.description),
        dueDate: normalizeDueDateValue(taskForm.value.dueDate),
      }

      await taskService.createTask(request)
    } else {
      if (!editingTaskId.value) {
        formErrorMessage.value = '수정할 업무 정보가 없습니다.'
        return
      }

      const request: UpdateTaskRequest = {
        assigneeId: normalizeNullableValue(taskForm.value.assigneeId),
        title: taskForm.value.title.trim(),
        description: normalizeNullableValue(taskForm.value.description),
        dueDate: normalizeDueDateValue(taskForm.value.dueDate),
      }

      await taskService.updateTask(editingTaskId.value, request)
    }

    closeTaskForm()
    await fetchTasks()
  } catch (error: unknown) {
    formErrorMessage.value =
      error instanceof Error ? error.message : '업무 저장에 실패했습니다.'
  } finally {
    isSavingTask.value = false
  }
}

async function changeTaskStatus(task: Task, status: string) {
  if (task.status === status) {
    return
  }

  try {
    await taskService.updateTaskStatus(task.id, {
      status,
      changedBy: currentUserId.value || null,
    })

    await fetchTasks()
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : '업무 상태를 변경하지 못했습니다.'
  }
}

async function removeTask(task: Task) {
  const confirmed = window.confirm(
    `"${task.title}" 업무를 삭제할까요?\n삭제된 업무는 목록에서 제외됩니다.`,
  )

  if (!confirmed) {
    return
  }

  try {
    await taskService.deleteTask(task.id)

    if (selectedTaskId.value === task.id) {
      closeTaskDetail()
    }

    await fetchTasks()
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error ? error.message : '업무를 삭제하지 못했습니다.'
  }
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

function normalizeNullableValue(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

function normalizeDueDateValue(value: string) {
  if (!value) {
    return null
  }

  return value
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return ''
  }

  return value.slice(0, 16)
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
    isTaskFormOpen.value = false
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

            <div class="task-list-content-actions">
              <span class="task-list-count-badge">
                {{ filteredTasks.length }}개 표시
              </span>
              <button
                type="button"
                class="task-list-add-button"
                @click="openCreateTaskForm"
              >
                + 업무 추가
              </button>
            </div>
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

              <div class="task-list-item-footer">
                <div
                  class="task-list-status-actions"
                  aria-label="Task status actions"
                  @click.stop
                >
                  <button
                    type="button"
                    class="task-list-status-action"
                    :class="{ active: task.status === 'ASSIGNED' }"
                    @click="changeTaskStatus(task, 'ASSIGNED')"
                  >
                    배정
                  </button>
                  <button
                    type="button"
                    class="task-list-status-action"
                    :class="{ active: task.status === 'IN_PROGRESS' }"
                    @click="changeTaskStatus(task, 'IN_PROGRESS')"
                  >
                    진행
                  </button>
                  <button
                    type="button"
                    class="task-list-status-action"
                    :class="{ active: task.status === 'REVIEW' }"
                    @click="changeTaskStatus(task, 'REVIEW')"
                  >
                    검토
                  </button>
                  <button
                    type="button"
                    class="task-list-status-action"
                    :class="{
                      active:
                        task.status === 'DONE' || task.status === 'COMPLETED',
                    }"
                    @click="changeTaskStatus(task, 'DONE')"
                  >
                    완료
                  </button>
                </div>

                <div class="task-list-row-actions" @click.stop>
                  <button
                    type="button"
                    class="task-list-row-button"
                    @click="openEditTaskForm(task)"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    class="task-list-row-button danger"
                    @click="removeTask(task)"
                  >
                    삭제
                  </button>
                </div>
              </div>
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

    <Teleport to="body">
      <div
        v-if="isTaskFormOpen"
        class="task-list-form-overlay"
        role="dialog"
        aria-modal="true"
      >
        <section class="task-list-form-modal">
          <header class="task-list-form-header">
            <div>
              <p class="task-list-eyebrow">{{ taskFormMode }}</p>
              <h2>{{ formTitle }}</h2>
            </div>

            <button
              type="button"
              class="task-list-form-close"
              aria-label="업무 입력 창 닫기"
              @click="closeTaskForm"
            >
              ×
            </button>
          </header>

          <form class="task-list-form-body" @submit.prevent="submitTaskForm">
            <p class="task-list-form-note">
              요청자는 현재 로그인 사용자로 자동 설정됩니다. 담당자 ID는 선택
              입력이며, 멤버 선택 API가 연결되면 드롭다운 방식으로 개선합니다.
            </p>

            <div v-if="formErrorMessage" class="task-list-form-error">
              {{ formErrorMessage }}
            </div>

            <div class="task-list-field">
              <label for="task-title">업무 제목</label>
              <input
                id="task-title"
                v-model="taskForm.title"
                type="text"
                placeholder="예: 문서 업로드 기능 구현"
                autocomplete="off"
              />
            </div>

            <div class="task-list-field">
              <label for="task-description">업무 설명</label>
              <textarea
                id="task-description"
                v-model="taskForm.description"
                placeholder="업무 목적, 범위, 필요한 산출물을 입력하세요."
              />
            </div>

            <div class="task-list-form-grid">
              <div class="task-list-field">
                <label for="task-assignee">담당자 ID</label>
                <input
                  id="task-assignee"
                  v-model="taskForm.assigneeId"
                  type="text"
                  placeholder="선택 입력"
                  autocomplete="off"
                />
              </div>

              <div class="task-list-field">
                <label for="task-due-date">마감일</label>
                <input
                  id="task-due-date"
                  v-model="taskForm.dueDate"
                  type="datetime-local"
                />
              </div>
            </div>

            <footer class="task-list-form-footer">
              <div class="task-list-form-footer-left">
                <button
                  type="button"
                  class="task-list-ghost-button"
                  :disabled="isSavingTask"
                  @click="closeTaskForm"
                >
                  취소
                </button>
              </div>

              <div class="task-list-form-footer-right">
                <button
                  type="submit"
                  class="task-list-danger-button"
                  :disabled="isSavingTask"
                >
                  {{ isSavingTask ? '저장 중...' : submitButtonLabel }}
                </button>
              </div>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>
  </AppLayout>
</template>
