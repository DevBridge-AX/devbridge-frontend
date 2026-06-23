<script setup lang="ts">
import { computed, ref, provide, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import FloatingChatWidget from '@/components/chat/FloatingChatWidget.vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { useChatStore } from '@/state/chatStore'
import { useWorkspaceStore } from '@/state/workspaceStore'
import '@/assets/styles/app-layout.css'

const route = useRoute()
const chatStore = useChatStore()
const workspaceStore = useWorkspaceStore()
const isSidebarCollapsed = ref(false)

const isDarkTheme = computed(() => {
  return route.name === 'settings-profile'
})

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

// ── Shared WebSocket Connection Setup ─────────────────────────────────────
const currentWorkspaceId = computed<string>(() => {
  const value = route.params.workspaceId
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return value || ''
})

const {
  isConnected,
  error,
  connect,
  disconnect,
  sendMessage,
  sendOwnerConfirmation,
} = useWebSocket(() => chatStore.activeSessionId ?? '')

function syncWorkspaceContext(workspaceId: string): void {
  if (!workspaceId || workspaceId.trim() === '') {
    return
  }

  workspaceStore.setWorkspaceId(workspaceId)
}

watch(
  () => currentWorkspaceId.value,
  (newId, oldId) => {
    if (!newId) {
      return
    }

    syncWorkspaceContext(newId)

    if (newId !== oldId) {
      disconnect()
      connect()
    }
  },
)

onMounted(() => {
  if (currentWorkspaceId.value) {
    syncWorkspaceContext(currentWorkspaceId.value)
    connect()
  }
})

onUnmounted(() => {
  disconnect()
})

// Share WebSocket controls with children views
provide('workspace-websocket', {
  isConnected,
  error,
  sendMessage,
  sendOwnerConfirmation,
})
</script>

<template>
  <div
    class="app-layout"
    :class="{
      'sidebar-collapsed': isSidebarCollapsed,
      'dark-theme': isDarkTheme,
    }"
  >
    <AppSidebar
      :is-collapsed="isSidebarCollapsed"
      @toggle-sidebar="toggleSidebar"
    />

    <div class="layout-main">
      <AppHeader @toggle-sidebar="toggleSidebar" />

      <main class="app-body">
        <slot />
      </main>

      <AppFooter v-if="route.name !== 'workspace-chat'" />
    </div>

    <!-- Floating PIP Chat Widget (Persists across workspace pages, hidden in full chat page) -->
    <FloatingChatWidget
      v-if="route.name !== 'workspace-chat' && currentWorkspaceId"
    />
  </div>
</template>
