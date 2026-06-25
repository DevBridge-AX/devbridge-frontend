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

const reviewCount = computed(
  () => tasks.value.filter((task) => task.status === 'REVIEW').length,
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

    isTaskFormOpen.value = false
    resetTaskForm()
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
    <div class="tl-shell">
      <div class="tl">

        <header class="tl-hero">
          <div class="tl-hero-left">
            <p class="tl-hero-lbl">Task Management</p>
            <h1>업무 {{ inProgressCount }}건 진행 중, 이번 주 {{ completedCount }}건 완료</h1>
            <p>담당자·마감일·진행 상태를 한눈에 추적하고, 업무 항목을 클릭해 관련 문서와 산출물을 확인할 수 있습니다.</p>
          </div>
          <div class="tl-hero-right">
            <button type="button" class="tl-hero-btn tl-hero-btn-pri" @click="openCreateTaskForm">+ 업무 추가</button>
            <button type="button" class="tl-hero-btn tl-hero-btn-sec" @click="goToDashboard">대시보드로 이동</button>
          </div>
        </header>

        <section class="tl-metrics">
          <button type="button" class="tl-metric" :class="{ active: selectedStatus === 'ALL' }" @click="setStatusFilter('ALL')">
            <div class="tl-metric-hd"><span class="lb">전체</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><line x1="8" y1="10" x2="8" y2="16"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="16" y1="8" x2="16" y2="16"/></svg></span></div>
            <div class="tl-metric-val"><span class="n">{{ totalCount }}</span></div>
            <div class="tl-metric-spark"><svg viewBox="0 0 200 28"><path d="M0 28 Q25 20 50 22 T100 14 T150 8 T200 10 L200 28Z" fill="var(--brand-light)"/><path d="M0 28 Q25 20 50 22 T100 14 T150 8 T200 10" fill="none" stroke="var(--brand-indigo)" stroke-width="1.5"/></svg></div>
          </button>
          <button type="button" class="tl-metric" :class="{ active: selectedStatus === 'ASSIGNED' }" @click="setStatusFilter('ASSIGNED')">
            <div class="tl-metric-hd"><span class="lb">배정</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg></span></div>
            <div class="tl-metric-val"><span class="n">{{ assignedCount }}</span></div>
            <div class="tl-metric-spark"><svg viewBox="0 0 200 28"><path d="M0 28 Q25 20 50 18 T100 22 T150 12 T200 14 L200 28Z" fill="var(--brand-light)"/><path d="M0 28 Q25 20 50 18 T100 22 T150 12 T200 14" fill="none" stroke="var(--brand-indigo)" stroke-width="1.5"/></svg></div>
          </button>
          <button type="button" class="tl-metric" :class="{ active: selectedStatus === 'IN_PROGRESS' }" @click="setStatusFilter('IN_PROGRESS')">
            <div class="tl-metric-hd"><span class="lb">진행</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></span></div>
            <div class="tl-metric-val"><span class="n">{{ inProgressCount }}</span></div>
            <div class="tl-metric-spark"><svg viewBox="0 0 200 28"><path d="M0 28 Q25 18 50 14 T100 10 T150 16 T200 8 L200 28Z" fill="var(--brand-light)"/><path d="M0 28 Q25 18 50 14 T100 10 T150 16 T200 8" fill="none" stroke="var(--brand-indigo)" stroke-width="1.5"/></svg></div>
          </button>
          <button type="button" class="tl-metric" :class="{ active: selectedStatus === 'DONE' }" @click="setStatusFilter('DONE')">
            <div class="tl-metric-hd"><span class="lb">완료</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span></div>
            <div class="tl-metric-val"><span class="n">{{ completedCount }}</span><span class="t up">&#9650;{{ totalCount > 0 ? Math.round(completedCount/totalCount*100) : 0 }}%</span></div>
            <div class="tl-metric-spark"><svg viewBox="0 0 200 28"><path d="M0 28 Q25 22 50 20 T100 12 T150 6 T200 4 L200 28Z" fill="var(--brand-light)"/><path d="M0 28 Q25 22 50 20 T100 12 T150 6 T200 4" fill="none" stroke="var(--brand-indigo)" stroke-width="1.5"/></svg></div>
          </button>
          <button type="button" class="tl-metric" :class="{ active: selectedStatus === 'OVERDUE' }" @click="setStatusFilter('OVERDUE')">
            <div class="tl-metric-hd"><span class="lb">지연</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span></div>
            <div class="tl-metric-val"><span class="n">{{ overdueCount }}</span></div>
            <div class="tl-metric-spark"><svg viewBox="0 0 200 28"><path d="M0 28 Q25 24 50 26 T100 20 T150 22 T200 24 L200 28Z" fill="var(--danger-bg)"/><path d="M0 28 Q25 24 50 26 T100 20 T150 22 T200 24" fill="none" stroke="var(--danger-text)" stroke-width="1.5"/></svg></div>
          </button>
          <button type="button" class="tl-metric" :class="{ active: selectedStatus === 'REVIEW' }" @click="setStatusFilter('REVIEW')">
            <div class="tl-metric-hd"><span class="lb">검토</span><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span></div>
            <div class="tl-metric-val"><span class="n">{{ reviewCount }}</span></div>
            <div class="tl-metric-spark"><svg viewBox="0 0 200 28"><path d="M0 28 Q25 18 50 20 T100 14 T150 16 T200 12 L200 28Z" fill="var(--brand-light)"/><path d="M0 28 Q25 18 50 20 T100 14 T150 16 T200 12" fill="none" stroke="var(--brand-indigo)" stroke-width="1.5"/></svg></div>
          </button>
        </section>

        <section class="tl-card">
          <div class="tl-card-hd">
            <div class="tl-card-hd-left">
              <h2>Task 목록</h2>
              <p>선택한 Workspace 기준 업무입니다. 항목을 클릭하면 상세 정보와 연결 데이터를 확인합니다.</p>
            </div>
            <div class="tl-card-hd-right">
              <span class="tl-count">{{ filteredTasks.length }}개</span>
              <div class="tl-filter">
                <button type="button" :class="{ on: selectedStatus === 'ALL' }" @click="setStatusFilter('ALL')">전체</button>
                <button type="button" :class="{ on: selectedStatus === 'IN_PROGRESS' }" @click="setStatusFilter('IN_PROGRESS')">진행</button>
                <button type="button" :class="{ on: selectedStatus === 'DONE' }" @click="setStatusFilter('DONE')">완료</button>
                <button type="button" :class="{ on: selectedStatus === 'OVERDUE' }" @click="setStatusFilter('OVERDUE')">지연</button>
              </div>
              <button type="button" class="tl-add-btn" @click="openCreateTaskForm">+ 업무 추가</button>
            </div>
          </div>

          <div v-if="isLoading" class="tl-state">업무 목록을 불러오는 중입니다.</div>
          <div v-else-if="errorMessage" class="tl-state error">{{ errorMessage }}</div>
          <div v-else-if="filteredTasks.length === 0" class="tl-state">조건에 맞는 업무가 없습니다.</div>

          <div v-else class="tl-rows">
            <article v-for="task in filteredTasks" :key="task.id" class="tl-row" :class="{ overdue: isOverdue(task) }" @click="openTaskDetail(task.id)">
              <span class="tl-row-icon" :class="task.status === 'IN_PROGRESS' ? 'go' : task.status === 'DONE' || task.status === 'COMPLETED' ? 'done' : isOverdue(task) ? 'delay' : 'wait'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <div class="tl-row-body">
                <div class="title">{{ task.title }}</div>
                <div v-if="task.description" class="desc">{{ task.description }}</div>
                <div class="meta">
                  <span>요청 {{ task.requesterId?.slice(0, 6) || '-' }}</span>
                  <span class="sep">·</span>
                  <span>담당 {{ task.assigneeId?.slice(0, 6) || '미지정' }}</span>
                  <span class="sep">·</span>
                  <span>마감 {{ formatDate(task.dueDate) }}</span>
                  <span v-if="isOverdue(task)" class="sep">·</span>
                  <span v-if="isOverdue(task)" style="color:var(--danger-text);font-weight:600">기한 초과</span>
                </div>
              </div>
              <div class="tl-row-right">
                <span class="chip" :class="task.status === 'IN_PROGRESS' ? 'go' : task.status === 'DONE' || task.status === 'COMPLETED' ? 'done' : isOverdue(task) ? 'delay' : 'wait'">{{ getStatusLabel(task.status) }}</span>
                <div class="tl-row-status" @click.stop>
                  <button v-if="task.status !== 'ASSIGNED'" class="status-btn" @click="changeTaskStatus(task, 'ASSIGNED')" title="배정">배정</button>
                  <button v-if="task.status !== 'IN_PROGRESS'" class="status-btn" @click="changeTaskStatus(task, 'IN_PROGRESS')" title="진행">진행</button>
                  <button v-if="task.status !== 'REVIEW'" class="status-btn" @click="changeTaskStatus(task, 'REVIEW')" title="검토">검토</button>
                  <button v-if="task.status !== 'DONE' && task.status !== 'COMPLETED'" class="status-btn done-btn" @click="changeTaskStatus(task, 'DONE')" title="완료">완료</button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>

    <TaskDetailModal :task-id="selectedTaskId" :is-open="isTaskDetailModalOpen" @close="closeTaskDetail" />

    <Teleport to="body">
      <div v-if="isTaskFormOpen" class="tl-form-overlay" role="dialog" aria-modal="true">
        <section class="tl-form">
          <header class="tl-form-hd">
            <h2>{{ formTitle }}</h2>
            <button type="button" class="tl-form-close" @click="closeTaskForm">&times;</button>
          </header>
          <form class="tl-form-body" @submit.prevent="submitTaskForm">
            <p class="tl-form-note">요청자는 현재 로그인 사용자로 자동 설정됩니다. 담당자 ID는 선택 입력입니다.</p>
            <div v-if="formErrorMessage" class="tl-form-error">{{ formErrorMessage }}</div>
            <div class="tl-field">
              <label for="task-title">업무 제목</label>
              <input id="task-title" v-model="taskForm.title" type="text" placeholder="예: 문서 업로드 기능 구현" autocomplete="off" />
            </div>
            <div class="tl-field">
              <label for="task-desc">업무 설명</label>
              <textarea id="task-desc" v-model="taskForm.description" placeholder="업무 목적, 범위, 필요한 산출물을 입력하세요." />
            </div>
            <div class="tl-field-grid">
              <div class="tl-field">
                <label for="task-assignee">담당자 ID</label>
                <input id="task-assignee" v-model="taskForm.assigneeId" type="text" placeholder="선택 입력" autocomplete="off" />
              </div>
              <div class="tl-field">
                <label for="task-due">마감일</label>
                <input id="task-due" v-model="taskForm.dueDate" type="datetime-local" />
              </div>
            </div>
            <footer class="tl-form-ft">
              <div class="tl-form-ft-left">
                <button type="button" class="tl-hero-btn tl-hero-btn-sec" :disabled="isSavingTask" @click="closeTaskForm" style="color:var(--text-body);border-color:var(--card-border);background:var(--page-bg)">취소</button>
              </div>
              <div class="tl-form-ft-right">
                <button type="submit" class="tl-hero-btn tl-hero-btn-pri" :disabled="isSavingTask" style="background:var(--brand-indigo);color:#fff;border:0">{{ isSavingTask ? '저장 중...' : submitButtonLabel }}</button>
              </div>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>
  </AppLayout>
</template>
