<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChatStore } from '@/state/chatStore'
import { chatService } from '@/services/chatService'

const chatStore = useChatStore()

const sessions = computed(() => chatStore.sessions)
const activeSessionId = computed(() => chatStore.activeSessionId)
const confirmingDeleteSessionId = ref<string | null>(null)
const isDeleting = ref(false)
const deleteErrorToast = ref(false)

const confirmingSessionTitle = computed(() => {
  if (!confirmingDeleteSessionId.value) return ''
  const session = sessions.value.find(s => s.id === confirmingDeleteSessionId.value)
  return session?.title ?? ''
})

const emit = defineEmits<{
  (e: 'select-session', sessionId: string): void
}>()

function handleNewChat() {
  emit('select-session', '')
}

function handleSelectSession(sessionId: string) {
  if (activeSessionId.value === sessionId) return
  emit('select-session', sessionId)
}

function triggerDeleteConfirm(sessionId: string) {
  confirmingDeleteSessionId.value = sessionId
}

async function handleConfirmDelete() {
  const sessionId = confirmingDeleteSessionId.value
  if (!sessionId) return

  isDeleting.value = true
  try {
    await chatService.deleteSession(sessionId)
    confirmingDeleteSessionId.value = null

    if (chatStore.activeSessionId === null) {
      emit('select-session', '')
    }
  } catch {
    confirmingDeleteSessionId.value = null
    showDeleteErrorToast()
  } finally {
    isDeleting.value = false
  }
}

function showDeleteErrorToast() {
  deleteErrorToast.value = true
  setTimeout(() => {
    deleteErrorToast.value = false
  }, 3000)
}

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
  <aside class="chat-history-sidebar" v-bind="$attrs">
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
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <p class="empty-state-title">아직 대화 내역이 없습니다</p>
        <p class="empty-state-subtitle">새 대화를 시작해 보세요</p>
      </div>
      <TransitionGroup v-else name="session-list" tag="div" class="session-list">
        <div
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
            @click.stop="triggerDeleteConfirm(session.id)"
            aria-label="세션 삭제"
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

  <!-- Delete Error Toast -->
  <Teleport to="body">
    <Transition name="toast-fade">
      <div v-if="deleteErrorToast" class="delete-error-toast" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <span>채팅방 삭제에 실패했습니다.</span>
      </div>
    </Transition>
  </Teleport>

  <!-- Delete Confirmation Modal -->
  <Teleport to="body">
    <Transition name="delete-modal">
      <div
        v-if="confirmingDeleteSessionId !== null"
        class="modal-overlay"
        @click="confirmingDeleteSessionId = null"
      >
        <div class="modal-card" @click.stop>
          <div class="modal-icon-area">
            <div class="modal-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </div>
          </div>
          <h3 class="modal-title">대화를 삭제할까요?</h3>
          <p v-if="confirmingSessionTitle" class="modal-session-name">
            "{{ confirmingSessionTitle }}"
          </p>
          <p class="modal-description">삭제된 대화는 복구할 수 없습니다.</p>
          <div class="modal-actions">
            <button class="btn-modal btn-cancel" :disabled="isDeleting" @click="confirmingDeleteSessionId = null">취소</button>
            <button class="btn-modal btn-delete" :disabled="isDeleting" @click="handleConfirmDelete">
              {{ isDeleting ? '삭제 중...' : '삭제' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Sidebar Layout (Dashboard Unified) ──────────────────────── */
.chat-history-sidebar {
  width: 280px;
  background-color: var(--card-bg, #ffffff);
  border-right: 1px solid var(--card-border, #E8EAF2);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--card-border, #E8EAF2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-body, #1B2031);
  margin: 0;
}
.new-chat-btn {
  display: inline-flex;
  align-items: center; gap: 4px;
  padding: 7px 14px;
  background: var(--brand-indigo, #5B52E3);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.new-chat-btn:hover { background: #4A43C9; }
.session-list-container { flex: 1; overflow-y: auto; padding: 8px; }
.session-list-container::-webkit-scrollbar { width: 4px; }
.session-list-container::-webkit-scrollbar-track { background: transparent; }
.session-list-container::-webkit-scrollbar-thumb { background: rgba(166,172,201,.3); border-radius: 2px; }
.session-list { position: relative; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; gap: 6px; }
.empty-state-icon { width: 48px; height: 48px; background: var(--brand-light, #F0F2FE); border-radius: 12px; display: grid; place-items: center; color: var(--brand-indigo, #5B52E3); margin-bottom: 4px; }
.empty-state-title { font-size: 13px; font-weight: 600; color: var(--text-secondary, #6B7191); margin: 0; }
.empty-state-subtitle { font-size: 12px; color: var(--text-light, #9AA0BD); margin: 0; }

.session-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: 8px;
  cursor: pointer; transition: background .15s; margin-bottom: 2px;
}
.session-item:hover { background: var(--page-bg, #F6F7FB); }
.session-item.active { background: var(--brand-light, #F0F2FE); border-left: 3px solid var(--brand-indigo, #5B52E3); }
.session-info { flex: 1; min-width: 0; }
.session-title { font-size: 13px; font-weight: 500; color: var(--text-body, #1B2031); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
.session-item.active .session-title { color: var(--brand-indigo, #5B52E3); font-weight: 600; }
.session-date { font-size: 11px; color: var(--text-light, #9AA0BD); }

.delete-btn {
  display: grid; place-items: center;
  width: 28px; height: 28px;
  background: none; border: none; border-radius: 6px;
  color: var(--text-light, #9AA0BD); cursor: pointer; flex-shrink: 0;
  opacity: 0; transform: translateX(6px); pointer-events: none;
  transition: opacity .2s, transform .2s;
}
.session-item:hover .delete-btn { opacity: 1; transform: translateX(0); pointer-events: auto; }
.delete-btn:hover { color: var(--danger-text, #D45D5D); background: var(--danger-bg, #FBF0F0); }

.modal-overlay { position: fixed; inset: 0; background: rgba(18,24,49,.5); backdrop-filter: blur(6px); display: flex; justify-content: center; align-items: center; z-index: 9000; }
.modal-card { background: var(--card-bg, #fff); border-radius: 16px; padding: 24px 20px 20px; width: 90%; max-width: 300px; text-align: center; box-shadow: var(--shadow-xl, 0 12px 40px rgba(27,32,49,.1)); }
.modal-icon-area { display: flex; justify-content: center; margin-bottom: 12px; }
.modal-icon-circle { width: 48px; height: 48px; background: var(--danger-bg, #FBF0F0); border-radius: 50%; display: grid; place-items: center; color: var(--danger-text, #D45D5D); }
.modal-title { font-size: 15px; font-weight: 700; color: var(--text-body, #1B2031); margin: 0 0 6px; }
.modal-session-name { font-size: 12px; color: var(--text-secondary, #6B7191); margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.modal-description { font-size: 12px; color: var(--text-light, #9AA0BD); margin: 0 0 16px; }
.modal-actions { display: flex; gap: 8px; }
.btn-modal { flex: 1; padding: 9px 12px; border-radius: 8px; font-family: var(--font-ui); font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all .15s; }
.btn-cancel { background: var(--page-bg, #F6F7FB); color: var(--text-secondary, #6B7191); }
.btn-cancel:hover { background: var(--card-border, #E8EAF2); }
.btn-delete { background: var(--danger-text, #D45D5D); color: #fff; }
.btn-delete:hover { opacity: .9; transform: translateY(-1px); }

/* ── Modal Transition ────────────────────────────────────────── */
.delete-modal-enter-active,
.delete-modal-leave-active {
  transition: opacity 0.25s ease;
}

.delete-modal-enter-from,
.delete-modal-leave-to {
  opacity: 0;
}

.delete-modal-enter-active .modal-card {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.delete-modal-leave-active .modal-card {
  transition: transform 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.delete-modal-enter-from .modal-card {
  transform: scale(0.85) translateY(12px);
}

.delete-modal-leave-to .modal-card {
  transform: scale(0.92) translateY(6px);
}

/* ── TransitionGroup List Animation ──────────────────────────── */
.session-list-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.session-list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  width: calc(100% - 1rem);
  z-index: 0;
}

.session-list-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}

.session-list-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
}

.session-list-move {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Delete Error Toast ─────────────────────────────────��──────── */
.delete-error-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 9999;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
