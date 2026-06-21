<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useChatStore } from '@/state/chatStore'
import { chatService } from '@/services/chatService'

const router = useRouter()
const route = useRoute()
const chatStore = useChatStore()

const sessions = computed(() => chatStore.sessions)
const activeSessionId = computed(() => chatStore.activeSessionId)
const confirmingDeleteSessionId = ref<string | null>(null)

const emit = defineEmits<{
  (e: 'select-session', sessionId: string): void
}>()

async function handleNewChat() {
  const newSession = await chatService.createSession()
  emit('select-session', newSession.id)
}

function handleSelectSession(sessionId: string) {
  if (activeSessionId.value === sessionId) return
  emit('select-session', sessionId)
}

function triggerDeleteConfirm(sessionId: string, event: Event) {
  event.stopPropagation() // 클릭 이벤트 전파 방지
  confirmingDeleteSessionId.value = sessionId
}

async function handleConfirmDelete(sessionId: string) {
  // TODO: 채팅 삭제 API 호출 연결
  chatStore.deleteSessionLocal(sessionId)
  confirmingDeleteSessionId.value = null
  
  // 만약 현재 활성화된 세션이 삭제되었다면 URL Query 제어 등은 부모에서 처리할 수 있도록 null emit (또는 부모가 알아서 처리)
  if (chatStore.activeSessionId === null) {
    emit('select-session', '')
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

    <div class="session-list-container">
      <div v-if="sessions.length === 0" class="empty-state">
        이전 대화 내역이 없습니다.
      </div>
      <TransitionGroup v-else name="session-list" tag="div" class="session-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :class="{ 
            active: activeSessionId === session.id, 
            'confirming-delete': confirmingDeleteSessionId === session.id 
          }"
          @click="handleSelectSession(session.id)"
        >
          <!-- normal session info -->
          <div class="session-info">
            <div class="session-title">{{ session.title }}</div>
            <div class="session-date">{{ formatSessionDate(session.updatedAt) }}</div>
          </div>
          
          <!-- delete button -->
          <button 
            class="delete-btn" 
            @click="(e) => triggerDeleteConfirm(session.id, e)"
            aria-label="세션 삭제"
            title="삭제"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </aside>

  <!-- Modal Portal / Dialog Overlay -->
  <Transition name="modal-fade">
    <div v-if="confirmingDeleteSessionId !== null" class="modal-overlay" @click="confirmingDeleteSessionId = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <div class="warning-icon-wrapper">
            <svg class="warning-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h3 class="modal-title">대화 기록 삭제</h3>
        </div>
        <div class="modal-body">
          <p class="modal-text">이 대화 기록을 정말 삭제하시겠습니까?</p>
          <p class="modal-subtext">삭제된 대화는 복구할 수 없습니다.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" @click="confirmingDeleteSessionId = null">취소</button>
          <button class="btn btn-delete" @click="handleConfirmDelete(confirmingDeleteSessionId)">삭제</button>
        </div>
      </div>
    </div>
  </Transition>
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

.session-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.session-list {
  position: relative;
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

.session-item.confirming-delete {
  background-color: #fef2f2 !important;
  border-left: 3px solid #ef4444 !important;
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
  transition: opacity 0.2s ease, color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
  border-radius: 4px;
  transform: scale(0.9);
  pointer-events: none;
}

.session-item:hover .delete-btn {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.delete-btn:hover {
  color: #ef4444;
  background-color: #fee2e2;
  transform: scale(1.05);
}

/* Modal Overlay & Dialog styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.35); /* Slate 900 tint */
  backdrop-filter: blur(8px); /* smooth premium blur */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--color-surface, #ffffff);
  border-radius: 16px; /* modern rounded corners */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03);
  width: 90%;
  max-width: 340px;
  overflow: hidden; /* to contain top header band backgrounds */
  border: 1px solid var(--color-border, #e2e8f0);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.25rem; /* reduced padding */
  background-color: var(--color-primary-light, #eff6ff); /* main color light tint */
  border-bottom: 1px solid rgba(59, 130, 246, 0.15);
}

.warning-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px; /* reduced size */
  height: 30px;
  background-color: #fee2e2;
  border-radius: 50%;
  flex-shrink: 0;
}

.warning-icon {
  color: #ef4444;
}

.modal-title {
  font-size: 0.95rem; /* reduced font size */
  font-weight: 700;
  color: var(--color-primary-dark, #2563eb); /* utilize main color dark variant */
  margin: 0;
}

.modal-body {
  padding: 1.25rem; /* tighter spacing */
}

.modal-text {
  font-size: 0.9rem;
  color: #334155;
  font-weight: 600;
  margin: 0 0 0.35rem 0;
}

.modal-subtext {
  font-size: 0.775rem;
  color: #64748b;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.25rem 1.25rem 0.75rem 1.25rem; /* blend with body and add bottom spacing */
  background-color: var(--color-surface, #ffffff); /* match body background */
}

.btn {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.85rem; /* slightly tighter button spacing */
  border-radius: 6px;
  cursor: pointer;
  border: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-cancel {
  background-color: #ffffff;
  color: var(--color-primary, #3b82f6); /* utilize main color */
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.btn-cancel:hover {
  background-color: var(--color-primary-light, #eff6ff);
  color: var(--color-primary-dark, #2563eb);
  border-color: var(--color-primary, #3b82f6);
}

.btn-delete {
  background-color: #dc2626;
  color: white;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.15);
}

.btn-delete:hover {
  background-color: #b91c1c;
  box-shadow: 0 4px 6px rgba(185, 28, 28, 0.2);
  transform: translateY(-1px);
}

.btn-delete:active {
  transform: translateY(0);
}

/* Modal Fade Animation */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-enter-from .modal-content {
  transform: scale(0.9) translateY(10px);
}

.modal-fade-leave-to .modal-content {
  transform: scale(0.95) translateY(5px);
}

/* Transition Group Animations */
.session-list-enter-active,
.session-list-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.session-list-enter-from,
.session-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.session-list-leave-active {
  position: absolute;
  width: calc(100% - 1rem);
  z-index: 0;
}

.session-list-move {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
