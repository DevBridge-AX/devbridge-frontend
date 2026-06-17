<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useChatStore } from '@/state/chatStore'
import { chatService } from '@/services/chatService'

const router = useRouter()
const route = useRoute()
const chatStore = useChatStore()

const sessions = computed(() => chatStore.sessions)
const activeSessionId = computed(() => chatStore.activeSessionId)

async function handleNewChat() {
  const newSession = await chatService.createSession()
  // URL Query 업데이트
  router.push({ query: { ...route.query, session: newSession.id } })
}

function handleSelectSession(sessionId: string) {
  if (activeSessionId.value === sessionId) return
  router.push({ query: { ...route.query, session: sessionId } })
}

async function handleDeleteSession(sessionId: string, event: Event) {
  event.stopPropagation() // 클릭 이벤트 전파 방지
  if (confirm('이 대화 기록을 삭제하시겠습니까?')) {
    await chatService.deleteSession(sessionId)
    // 만약 현재 활성화된 세션이 삭제되었다면 URL Query 제거
    if (activeSessionId.value === null) {
      const query = { ...route.query }
      delete query.session
      router.push({ query })
    }
  }
}

// 날짜 포맷팅 함수 (ex: "오늘", "어제", "2023.10.12")
function formatSessionDate(dateString: string) {
  const date = new Date(dateString)
  const today = new Date()
  
  const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString()
}
</script>

<template>
  <aside class="chat-history-sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">대화 기록</h2>
      <button class="new-chat-btn" @click="handleNewChat" aria-label="새로운 대화 시작">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        새 대화
      </button>
    </div>

    <div class="session-list">
      <div v-if="sessions.length === 0" class="empty-state">
        이전 대화 내역이 없습니다.
      </div>
      <div
        v-else
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: activeSessionId === session.id }"
        @click="handleSelectSession(session.id)"
      >
        <div class="session-info">
          <div class="session-title">{{ session.title }}</div>
          <div class="session-date">{{ formatSessionDate(session.updatedAt) }}</div>
        </div>
        <button 
          class="delete-btn" 
          @click="(e) => handleDeleteSession(session.id, e)"
          aria-label="세션 삭제"
          title="삭제"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.chat-history-sidebar {
  width: 280px;
  background-color: var(--color-surface, #ffffff);
  border-right: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
  margin: 0;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--color-primary, #3b82f6);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.new-chat-btn:hover {
  background-color: var(--color-primary-dark, #2563eb);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-light, #94a3b8);
  font-size: 0.875rem;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
}

.session-item:hover {
  background-color: var(--color-bg, #f1f5f9);
}

.session-item.active {
  background-color: var(--color-primary-light, #eff6ff);
  border-left: 3px solid var(--color-primary, #3b82f6);
}

.session-info {
  flex: 1;
  min-width: 0; /* for text truncation */
}

.session-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.25rem;
}

.session-item.active .session-title {
  color: var(--color-primary, #3b82f6);
  font-weight: 600;
}

.session-date {
  font-size: 0.75rem;
  color: var(--color-text-light, #94a3b8);
}

.delete-btn {
  background: none;
  border: none;
  color: var(--color-text-light, #94a3b8);
  padding: 0.25rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
  border-radius: 4px;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #ef4444;
  background-color: #fee2e2;
}
</style>
