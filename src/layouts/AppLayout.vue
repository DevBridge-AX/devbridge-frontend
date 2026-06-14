<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppFooter from '@/components/common/AppFooter.vue'
import { workspaceService } from '@/services/workspaceService'
import type { Workspace } from '@/api/workspaceApi'

const route = useRoute()
const router = useRouter()

const isSidebarCollapsed = ref(false)
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
  return currentWorkspace.value?.name ?? 'Workspace 선택'
})

const hasWorkspaceContext = computed(() => {
  return Boolean(currentWorkspaceId.value)
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

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value

  if (isSidebarCollapsed.value) {
    isWorkspaceMenuOpen.value = false
  }
}

function toggleWorkspaceMenu() {
  isWorkspaceMenuOpen.value = !isWorkspaceMenuOpen.value
}

async function selectWorkspace(workspaceId: string) {
  if (!workspaceId) {
    return
  }

  try {
    await workspaceService.updateWorkspaceAccess(workspaceId)
  } catch {
    // 로컬 개발 중 access 갱신 실패가 있더라도 화면 전환 자체는 막지 않음
  }

  isWorkspaceMenuOpen.value = false
  await router.push(`/workspaces/${workspaceId}/dashboard`)
}

function goToWorkspaceList() {
  isWorkspaceMenuOpen.value = false
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

function isActiveMenu(menu: 'dashboard' | 'tasks') {
  if (menu === 'dashboard') {
    return route.name === 'workspace-dashboard'
  }

  if (menu === 'tasks') {
    return route.name === 'workspace-tasks'
  }

  return false
}

onMounted(() => {
  fetchWorkspaces()
})
</script>

<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <aside class="sidebar">
      <template v-if="isSidebarCollapsed">
        <button
          type="button"
          class="collapsed-open-button"
          aria-label="사이드바 펼치기"
          @click="toggleSidebar"
        >
          ›
        </button>
      </template>

      <template v-else>
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
            @click="toggleSidebar"
          >
            ‹
          </button>
        </div>

        <section class="workspace-section">
          <p class="section-label">Workspace</p>

          <button
            type="button"
            class="workspace-trigger"
            @click="toggleWorkspaceMenu"
          >
            <span class="workspace-avatar">
              {{ currentWorkspaceName.slice(0, 1) }}
            </span>

            <span class="workspace-meta">
              <strong>{{ currentWorkspaceName }}</strong>
              <small>
                {{ hasWorkspaceContext ? '현재 작업 공간' : '선택 필요' }}
              </small>
            </span>

            <span class="chevron">
              {{ isWorkspaceMenuOpen ? '▲' : '▼' }}
            </span>
          </button>

          <div v-if="isWorkspaceMenuOpen" class="workspace-menu">
            <p v-if="workspaceErrorMessage" class="workspace-error">
              {{ workspaceErrorMessage }}
            </p>

            <button
              v-for="workspace in workspaces"
              :key="workspace.id"
              type="button"
              class="workspace-option"
              :class="{ active: workspace.id === currentWorkspaceId }"
              @click.stop="selectWorkspace(workspace.id)"
            >
              <span>{{ workspace.name }}</span>
              <small>{{ workspace.description || workspace.id }}</small>
            </button>

            <button
              type="button"
              class="workspace-list-button"
              @click.stop="goToWorkspaceList"
            >
              Workspace 목록 보기
            </button>
          </div>
        </section>

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

          <button type="button" class="nav-item disabled">
            <span class="nav-icon">N</span>
            <span>Documents</span>
          </button>

          <button type="button" class="nav-item disabled">
            <span class="nav-icon">C</span>
            <span>Chat</span>
          </button>

          <button type="button" class="nav-item disabled">
            <span class="nav-icon">S</span>
            <span>Schedule</span>
          </button>

          <button type="button" class="nav-item disabled">
            <span class="nav-icon">P</span>
            <span>Settings</span>
          </button>
        </nav>

        <div class="sidebar-note">
          <strong>Day 5 MVP</strong>
          <span>Documents, Chat, Schedule은 이후 단계에서 연결 예정</span>
        </div>
      </template>
    </aside>

    <div class="layout-main">
      <main class="app-body">
        <slot />
      </main>

      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  background: #f5f7fb;
  color: #172033;
}

.sidebar {
  position: sticky;
  top: 0;
  width: 280px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 16px;
  background: #111827;
  color: #f8fafc;
  transition: width 0.2s ease;
  box-shadow: 12px 0 32px rgba(15, 23, 42, 0.16);
  z-index: 20;
}

.sidebar-collapsed .sidebar {
  width: 34px;
  padding: 14px 6px;
  align-items: center;
}

.collapsed-open-button {
  width: 22px;
  height: 46px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
  font-size: 20px;
  font-weight: 900;
  cursor: pointer;
  line-height: 1;
}

.collapsed-open-button:hover {
  background: #2563eb;
  color: #ffffff;
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.brand-button {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.brand-mark {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #ffffff;
  font-weight: 900;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-text strong {
  font-size: 16px;
}

.brand-text small {
  color: #94a3b8;
  font-size: 12px;
}

.collapse-button {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.4);
  color: #e2e8f0;
  cursor: pointer;
  font-size: 18px;
  font-weight: 900;
}

.workspace-section,
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-label {
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.workspace-trigger,
.nav-item,
.workspace-option,
.workspace-list-button {
  border: 0;
  cursor: pointer;
  font-family: inherit;
}

.workspace-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 16px;
  padding: 12px;
  background: rgba(30, 41, 59, 0.92);
  color: #ffffff;
  text-align: left;
}

.workspace-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 900;
}

.workspace-meta {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.workspace-meta strong {
  overflow: hidden;
  color: #ffffff;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-meta small {
  color: #94a3b8;
  font-size: 12px;
}

.chevron {
  color: #cbd5e1;
  font-size: 11px;
}

.workspace-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.9);
  padding: 10px;
}

.workspace-error {
  margin: 0;
  color: #fecaca;
  font-size: 12px;
  line-height: 1.5;
}

.workspace-option {
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-radius: 12px;
  background: transparent;
  color: #e2e8f0;
  padding: 10px;
  text-align: left;
}

.workspace-option:hover,
.workspace-option.active {
  background: rgba(37, 99, 235, 0.28);
}

.workspace-option span {
  font-size: 14px;
  font-weight: 800;
}

.workspace-option small {
  color: #94a3b8;
  font-size: 12px;
}

.workspace-list-button {
  border-radius: 12px;
  background: #f8fafc;
  color: #1e293b;
  padding: 10px;
  font-size: 12px;
  font-weight: 900;
}

.sidebar-nav {
  flex: 1;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 14px;
  background: transparent;
  color: #cbd5e1;
  padding: 12px;
  font-size: 14px;
  font-weight: 800;
  text-align: left;
}

.nav-item:hover,
.nav-item.active {
  background: rgba(37, 99, 235, 0.24);
  color: #ffffff;
}

.nav-item.disabled {
  color: #64748b;
  cursor: not-allowed;
}

.nav-item.disabled:hover {
  background: transparent;
  color: #64748b;
}

.nav-icon {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: rgba(148, 163, 184, 0.16);
  font-size: 12px;
  font-weight: 900;
}

.nav-item.active .nav-icon {
  background: #2563eb;
  color: #ffffff;
}

.sidebar-note {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.42);
  padding: 12px;
}

.sidebar-note strong {
  font-size: 12px;
}

.sidebar-note span {
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}

.layout-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-body {
  flex: 1;
}

@media (max-width: 900px) {
  .app-layout {
    flex-direction: column;
  }

  .sidebar,
  .sidebar-collapsed .sidebar {
    position: relative;
    width: 100%;
    height: auto;
    align-items: stretch;
    padding: 14px;
  }

  .collapsed-open-button {
    width: 100%;
    height: 40px;
  }
}
</style>
