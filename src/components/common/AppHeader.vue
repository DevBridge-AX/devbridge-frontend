<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { workspaceService } from '@/services/workspaceService'
import type { Workspace } from '@/api/workspaceApi'
import { useAuthStore } from '@/state/authStore'

defineEmits<{
  toggleSidebar: []
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isWorkspaceMenuOpen = ref(false)
const workspaces = ref<Workspace[]>([])
const workspaceErrorMessage = ref('')

const currentWorkspaceId = computed(() => {
  const value = route.params.workspaceId
  return Array.isArray(value) ? value[0] : value
})

const currentWorkspace = computed(() => {
  return (
    workspaces.value.find(
      (workspace) => workspace.id === currentWorkspaceId.value,
    ) ?? null
  )
})

const currentWorkspaceName = computed(() => {
  return currentWorkspace.value?.name ?? '워크스페이스 선택'
})

const currentUser = computed(() => authStore.currentUser)

const profileInitial = computed(() => {
  return (
    currentUser.value?.name?.slice(0, 1).toUpperCase() ||
    currentUser.value?.employeeId?.slice(0, 1).toUpperCase() ||
    'U'
  )
})

const profileLabel = computed(() => {
  if (!currentUser.value) {
    return '사용자 정보'
  }

  return `${currentUser.value.name} · ${currentUser.value.position}`
})

const pageTitle = computed(() => {
  if (route.name === 'workspace-dashboard') {
    return 'Dashboard'
  }

  if (route.name === 'workspace-tasks') {
    return 'Tasks'
  }

  if (route.name === 'workspace-schedule') {
    return 'Schedule'
  }

  if (route.name === 'workspace') {
    return 'Workspace'
  }

  if (route.name === 'settings-profile') {
    return 'Profile'
  }

  return 'DevBridge AX'
})

const pageDescription = computed(() => {
  if (route.name === 'workspace-dashboard') {
    return '워크스페이스 현황과 주요 업무를 확인합니다.'
  }

  if (route.name === 'workspace-tasks') {
    return '워크스페이스 업무를 관리합니다.'
  }

  if (route.name === 'workspace-schedule') {
    return '워크스페이스 일정을 확인합니다.'
  }

  if (route.name === 'workspace') {
    return '참여 중인 워크스페이스를 선택합니다.'
  }

  if (route.name === 'settings-profile') {
    return '내 프로필 정보를 확인합니다.'
  }

  return 'Project Intelligence Platform'
})

async function fetchWorkspaces() {
  workspaceErrorMessage.value = ''

  try {
    workspaces.value = await workspaceService.getMyWorkspaces()
  } catch (error) {
    workspaceErrorMessage.value =
      error instanceof Error
        ? error.message
        : '워크스페이스 목록을 불러오지 못했습니다.'
  }
}

function toggleWorkspaceMenu() {
  isWorkspaceMenuOpen.value = !isWorkspaceMenuOpen.value
}

function getWorkspaceTargetPath(workspaceId: string) {
  if (route.name === 'workspace-tasks') {
    return `/workspaces/${workspaceId}/tasks`
  }

  if (route.name === 'workspace-schedule') {
    return `/workspaces/${workspaceId}/schedule`
  }

  return `/workspaces/${workspaceId}/dashboard`
}

async function selectWorkspace(workspaceId: string) {
  if (!workspaceId) {
    return
  }

  try {
    await workspaceService.updateWorkspaceAccess(workspaceId)
  } catch {
    // 로컬 개발 중 access 갱신 실패가 있더라도 화면 이동 자체는 막지 않는다.
  }

  isWorkspaceMenuOpen.value = false
  await router.push(getWorkspaceTargetPath(workspaceId))
}

function goToWorkspaceList() {
  isWorkspaceMenuOpen.value = false
  router.push('/workspace')
}

function goToProfile() {
  router.push('/settings/profile')
}

onMounted(() => {
  void fetchWorkspaces()
})
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="header-left">
        <button
          type="button"
          class="header-menu-button"
          aria-label="사이드바 접기 또는 펼치기"
          @click="$emit('toggleSidebar')"
        >
          ☰
        </button>

        <div class="header-title">
          <strong>{{ pageTitle }}</strong>
          <span>{{ pageDescription }}</span>
        </div>
      </div>

      <div class="header-actions">
        <div class="header-workspace">
          <button
            type="button"
            class="header-workspace-trigger"
            @click="toggleWorkspaceMenu"
          >
            <span>{{ currentWorkspaceName }}</span>
            <span>{{ isWorkspaceMenuOpen ? '▲' : '▼' }}</span>
          </button>

          <div v-if="isWorkspaceMenuOpen" class="header-workspace-menu">
            <p v-if="workspaceErrorMessage" class="workspace-error">
              {{ workspaceErrorMessage }}
            </p>

            <button
              v-for="workspace in workspaces"
              :key="workspace.id"
              type="button"
              class="header-workspace-option"
              :class="{ active: workspace.id === currentWorkspaceId }"
              @click="selectWorkspace(workspace.id)"
            >
              <strong>{{ workspace.name }}</strong>
              <small>{{ workspace.description || workspace.id }}</small>
            </button>

            <button
              type="button"
              class="header-workspace-list"
              @click="goToWorkspaceList"
            >
              전체 워크스페이스 보기
            </button>
          </div>
        </div>

        <input
          class="header-search"
          type="search"
          placeholder="Search workspace"
        />

        <button
          type="button"
          class="profile-button"
          :title="profileLabel"
          @click="goToProfile"
        >
          {{ profileInitial }}
        </button>
      </div>
    </div>
  </header>
</template>
