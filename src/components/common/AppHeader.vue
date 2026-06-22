<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { workspaceService } from '@/services/workspaceService'
import type { Workspace } from '@/api/workspaceApi'
import { useAuthStore } from '@/state/authStore'
import { useNotificationStore } from '@/state/notificationStore'
import { authService } from '@/services/authService'
import { notificationApi } from '@/api/notificationApi'

defineEmits<{
  toggleSidebar: []
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const isDrawerOpen = ref(false)
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

const unreadBadgeText = computed(() => {
  const count = notificationStore.unreadCount
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
})

async function loadUnreadCount() {
  const employeeId = authStore.currentUser?.employeeId
  if (!employeeId) return

  try {
    const page = await notificationApi.getNotifications(employeeId, {
      isRead: false,
      page: 0,
      size: 1,
    })
    notificationStore.setNotifications([], page.totalElements)
  } catch {
    // 알림 개수 로드 실패는 무시하고 0으로 유지
  }
}

function toggleNotificationDrawer() {
  isDrawerOpen.value = !isDrawerOpen.value
}

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

const isProfileMenuOpen = ref(false)
const profileContainerRef = ref<HTMLElement | null>(null)

function toggleProfileMenu(event: Event) {
  event.stopPropagation()
  isProfileMenuOpen.value = !isProfileMenuOpen.value
}

function closeProfileMenu(event: Event) {
  if (
    profileContainerRef.value &&
    !profileContainerRef.value.contains(event.target as Node)
  ) {
    isProfileMenuOpen.value = false
  }
}

function goToProfile() {
  isProfileMenuOpen.value = false
  router.push('/settings/profile')
}

async function handleLogout() {
  isProfileMenuOpen.value = false
  await authService.executeLogout()
  router.push('/login')
}

onMounted(() => {
  void fetchWorkspaces()
  void loadUnreadCount()
  document.addEventListener('click', closeProfileMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeProfileMenu)
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
          class="header-notification-button"
          aria-label="알림"
          @click="toggleNotificationDrawer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span
            v-if="unreadBadgeText"
            class="notification-badge"
          >{{ unreadBadgeText }}</span>
        </button>

        <div ref="profileContainerRef" class="header-profile">
          <button
            type="button"
            class="profile-button"
            :title="profileLabel"
            @click="toggleProfileMenu"
          >
            {{ profileInitial }}
          </button>

          <div v-if="isProfileMenuOpen" class="header-profile-menu">
            <button
              type="button"
              class="header-profile-option"
              @click="goToProfile"
            >
              내 프로필
            </button>
            <button
              type="button"
              class="header-profile-option logout"
              @click="handleLogout"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
