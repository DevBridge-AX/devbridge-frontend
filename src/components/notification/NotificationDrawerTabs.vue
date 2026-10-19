<script setup lang="ts">
import type { NotificationDrawerTab } from '@/types/notification'

// ─── Props / Emits ─────────────────────────────────────────────────────────

defineProps<{
  activeTab: NotificationDrawerTab
  unreadCount: number
}>()

const emit = defineEmits<{
  change: [tab: NotificationDrawerTab]
}>()

function handleChange(tab: NotificationDrawerTab): void {
  emit('change', tab)
}
</script>

<template>
  <div class="drawer-tabs">
    <button
      type="button"
      class="drawer-tab"
      :class="{ active: activeTab === 'all' }"
      @click="handleChange('all')"
    >전체</button>
    <button
      type="button"
      class="drawer-tab"
      :class="{ active: activeTab === 'unread' }"
      @click="handleChange('unread')"
    >
      안읽음
      <span v-if="unreadCount > 0" class="tab-count">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>
    <button
      type="button"
      class="drawer-tab"
      :class="{ active: activeTab === 'requests' }"
      @click="handleChange('requests')"
    >내 요청</button>
  </div>
</template>
