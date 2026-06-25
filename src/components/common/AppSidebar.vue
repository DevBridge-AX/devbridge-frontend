<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/state/workspaceStore'
import BrandLogo from '@/components/common/BrandLogo.vue'

const props = defineProps<{
  isCollapsed: boolean
}>()

const emit = defineEmits<{
  toggleSidebar: []
}>()

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()

const currentWorkspaceId = computed(() => {
  const value = route.params.workspaceId
  const fromRoute = Array.isArray(value) ? value[0] : value
  return fromRoute || workspaceStore.currentWorkspaceId
})

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', routeName: 'workspace-dashboard' },
  { key: 'tasks', label: 'Tasks', icon: 'checkSquare', routeName: 'workspace-tasks' },
  { key: 'documents', label: 'Documents', icon: 'fileText', routeName: 'workspace-documents' },
  { key: 'chat', label: 'Chat', icon: 'messageSquare', routeName: 'workspace-chat' },
  { key: 'datasources', label: 'Data Sources', icon: 'database', routeName: 'workspace-datasources' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar', routeName: 'workspace-schedule' },
  { key: 'settings', label: 'Settings', icon: 'settings', routeName: 'settings-profile' },
] as const

function isActiveMenu(key: string) {
  if (key === 'settings') return route.name === 'settings-profile'
  return route.name === navItems.find(n => n.key === key)?.routeName
}

function navigate(key: string) {
  if (key === 'settings') {
    router.push('/settings/profile')
    return
  }
  if (!currentWorkspaceId.value) {
    router.push('/workspace')
    return
  }
  router.push(`/workspaces/${currentWorkspaceId.value}/${key === 'datasources' ? 'datasources' : key}`)
}

function goToWorkspaceList() {
  router.push('/workspace')
}
</script>

<template>
  <aside v-if="!props.isCollapsed" class="app-sidebar">
    <div class="sidebar-top">
      <button type="button" class="brand-button" @click="goToWorkspaceList">
        <BrandLogo variant="dark" size="md" show-subtitle />
      </button>
    </div>

    <nav class="sidebar-nav" aria-label="Workspace navigation">
      <p class="section-label">Menu</p>

      <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        class="nav-item"
        :class="{ active: isActiveMenu(item.key) }"
        @click="navigate(item.key)"
      >
        <!-- Lucide line icons inline SVGs -->
        <!-- Dashboard: LayoutDashboard -->
        <span v-if="item.icon === 'grid'" class="nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
          </svg>
        </span>
        <!-- Tasks: CheckSquare -->
        <span v-else-if="item.icon === 'checkSquare'" class="nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </span>
        <!-- Documents: FileText -->
        <span v-else-if="item.icon === 'fileText'" class="nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </span>
        <!-- Chat: MessageSquare -->
        <span v-else-if="item.icon === 'messageSquare'" class="nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </span>
        <!-- Data Sources: Database -->
        <span v-else-if="item.icon === 'database'" class="nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
        </span>
        <!-- Schedule: Calendar -->
        <span v-else-if="item.icon === 'calendar'" class="nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </span>
        <!-- Settings: Settings -->
        <span v-else-if="item.icon === 'settings'" class="nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
          </svg>
        </span>
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="sidebar-note">
      <strong>Workspace Flow</strong>
      <span>Documents, Git, AI 분석 기능을 업무 흐름과 연결합니다.</span>
    </div>
  </aside>
</template>
