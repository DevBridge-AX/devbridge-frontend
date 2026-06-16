<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import '@/assets/styles/app-layout.css'

const route = useRoute()
const isSidebarCollapsed = ref(false)

const isDarkTheme = computed(() => {
  return route.name === 'settings-profile'
})

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
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

      <AppFooter />
    </div>
  </div>
</template>
