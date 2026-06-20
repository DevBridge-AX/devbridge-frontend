<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<{
  isCollapsed: boolean
}>()

const emit = defineEmits<{
  toggleSidebar: []
}>()

const route = useRoute()
const router = useRouter()

const currentWorkspaceId = computed(() => {
  const value = route.params.workspaceId
  return Array.isArray(value) ? value[0] : value
})

function goToWorkspaceList() {
  router.push('/workspace')
}

function goToDashboard() {
  if (!currentWorkspaceId.value) {
    router.push('/workspace')
    return
  }

  router.push(`/workspaces/${currentWorkspaceId.value}/dashboard`)
}

function goToTasks() {
  if (!currentWorkspaceId.value) {
    router.push('/workspace')
    return
  }

  router.push(`/workspaces/${currentWorkspaceId.value}/tasks`)
}

function goToDocuments() {
  if (!currentWorkspaceId.value) {
    router.push('/workspace')
    return
  }

  router.push(`/workspaces/${currentWorkspaceId.value}/documents`)
}

function goToChat() {
  if (!currentWorkspaceId.value) {
    router.push('/workspace')
    return
  }

  router.push(`/workspaces/${currentWorkspaceId.value}/chat`)
}

function goToDataSources() {
  if (!currentWorkspaceId.value) {
    router.push('/workspace')
    return
  }

  router.push(`/workspaces/${currentWorkspaceId.value}/datasources`)
}

function goToSchedule() {
  if (!currentWorkspaceId.value) {
    router.push('/workspace')
    return
  }

  router.push(`/workspaces/${currentWorkspaceId.value}/schedule`)
}

function goToSettings() {
  router.push('/settings/profile')
}

function isActiveMenu(
  menu:
    | 'dashboard'
    | 'tasks'
    | 'documents'
    | 'chat'
    | 'datasources'
    | 'schedule'
    | 'settings',
) {
  if (menu === 'dashboard') {
    return route.name === 'workspace-dashboard'
  }

  if (menu === 'tasks') {
    return route.name === 'workspace-tasks'
  }

  if (menu === 'documents') {
    return route.name === 'workspace-documents'
  }

  if (menu === 'chat') {
    return route.name === 'workspace-chat'
  }

  if (menu === 'datasources') {
    return route.name === 'workspace-datasources'
  }

  if (menu === 'schedule') {
    return route.name === 'workspace-schedule'
  }

  if (menu === 'settings') {
    return route.name === 'settings-profile'
  }

  return false
}
</script>

<template>
  <aside v-if="!props.isCollapsed" class="app-sidebar">
    <div class="sidebar-top">
      <button type="button" class="brand-button" @click="goToWorkspaceList">
        <span class="brand-mark">D</span>

        <span class="brand-text">
          <strong>DevBridge AX</strong>
          <small>Project Platform</small>
        </span>
      </button>

      <button
        type="button"
        class="collapse-button"
        aria-label="사이드바 접기"
        @click="emit('toggleSidebar')"
      >
        ‹
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="Workspace navigation">
      <p class="section-label">Menu</p>

      <button
        type="button"
        class="nav-item"
        :class="{ active: isActiveMenu('dashboard') }"
        @click="goToDashboard"
      >
        <span class="nav-icon">D</span>
        <span>Dashboard</span>
      </button>

      <button
        type="button"
        class="nav-item"
        :class="{ active: isActiveMenu('tasks') }"
        @click="goToTasks"
      >
        <span class="nav-icon">T</span>
        <span>Tasks</span>
      </button>

      <button
        type="button"
        class="nav-item"
        :class="{ active: isActiveMenu('documents') }"
        @click="goToDocuments"
      >
        <span class="nav-icon">N</span>
        <span>Documents</span>
      </button>

      <button
        type="button"
        class="nav-item"
        :class="{ active: isActiveMenu('chat') }"
        @click="goToChat"
      >
        <span class="nav-icon">C</span>
        <span>Chat</span>
      </button>

      <button
        type="button"
        class="nav-item"
        :class="{ active: isActiveMenu('datasources') }"
        @click="goToDataSources"
      >
        <span class="nav-icon">I</span>
        <span>Data Sources</span>
      </button>

      <button
        type="button"
        class="nav-item"
        :class="{ active: isActiveMenu('schedule') }"
        @click="goToSchedule"
      >
        <span class="nav-icon">S</span>
        <span>Schedule</span>
      </button>

      <button
        type="button"
        class="nav-item"
        :class="{ active: isActiveMenu('settings') }"
        @click="goToSettings"
      >
        <span class="nav-icon">P</span>
        <span>Settings</span>
      </button>
    </nav>

    <div class="sidebar-note">
      <strong>Workspace Flow</strong>
      <span>Documents, Git, AI 분석 기능을 업무 흐름과 연결합니다.</span>
    </div>
  </aside>
</template>
