<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MessageList from '@/components/chat/MessageList.vue'
import OwnerConfirmationCard from '@/components/chat/OwnerConfirmationCard.vue'
import OwnerAnswerToast from '@/components/chat/OwnerAnswerToast.vue'
import ChatHistorySidebar from '@/components/chat/ChatHistorySidebar.vue'
import DirectQuestionModal from '@/components/chat/DirectQuestionModal.vue'
import { useChatStore } from '@/state/chatStore'
import { chatService } from '@/services/chatService'
import '@/assets/styles/chat.css'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()

const ws = inject<{
  isConnected: { value: boolean }
  error: { value: string | null }
  sendMessage: (content: string) => void
  sendOwnerConfirmation: (messageId: string, ownerId: string) => void
}>('workspace-websocket')

const isConnected = computed(() => ws?.isConnected.value ?? false)
const error = computed(() => ws?.error.value ?? null)

const inputText = computed({
  get: () => chatStore.inputText,
  set: (val: string) => { chatStore.setInputText(val) },
})

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isComposing = ref(false)
const isInputFocused = ref(false)
const showPlusMenu = ref(false)
const showDirectQuestion = ref(false)

function togglePlusMenu() {
  showPlusMenu.value = !showPlusMenu.value
}

function openDirectQuestion() {
  showPlusMenu.value = false
  showDirectQuestion.value = true
}

function handleDirectQuestionSent() {
  showDirectQuestion.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !isComposing.value) {
    event.preventDefault()
    handleSend()
  }
}

function resizeTextarea() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

watch(() => chatStore.inputText, () => {
  nextTick(resizeTextarea)
})

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || !ws) return

  if (!chatStore.activeSessionId) {
    const newSession = await chatService.createSession()
    router.replace({ query: { ...route.query, session: newSession.id } })
  }

  ws.sendMessage(text)
  chatStore.setInputText('')

  const el = textareaRef.value
  if (el) { el.style.height = 'auto' }

  nextTick(() => { textareaRef.value?.focus() })
}

function handleSuggestionClick(text: string) {
  chatStore.setInputText(text)
  nextTick(() => {
    textareaRef.value?.focus()
    resizeTextarea()
  })
}

function handleOwnerConfirm() {
  const pending = chatStore.pendingOwnerConfirmation
  if (pending && ws) {
    ws.sendOwnerConfirmation(pending.messageId, pending.ownerId)
    chatStore.clearPendingOwnerConfirmation()
  }
}

function handleOwnerCancel() {
  chatStore.clearPendingOwnerConfirmation()
}

onMounted(async () => {
  await chatService.loadSessions()
  chatService.initAutoSave()
  if (route.query.session) {
    await chatService.loadSessionMessages(route.query.session as string)
  } else if (chatStore.activeSessionId) {
    router.replace({ query: { ...route.query, session: chatStore.activeSessionId } })
  }
})

watch(() => route.query.session, async (newSessionId) => {
  if (newSessionId) {
    await chatService.loadSessionMessages(newSessionId as string)
  } else {
    chatStore.cacheCurrentSession()
    chatStore.setActiveSessionId(null)
    chatStore.resetChat()
  }
})

function handleSidebarSelectSession(sessionId: string) {
  if (sessionId) {
    router.push({ query: { ...route.query, session: sessionId } })
  } else {
    const query = { ...route.query }
    delete query.session
    router.push({ query })
  }
}

function getSessionTitle(): string {
  if (chatStore.activeSessionId) {
    const session = chatStore.sessions.find(s => s.id === chatStore.activeSessionId)
    return session?.title || 'Workspace Knowledge Assistant'
  }
  return 'Workspace Knowledge Assistant'
}
</script>

<template>
  <div class="chat-shell">
    <!-- Left: Session History Panel -->
    <aside class="chat-history-panel">
      <ChatHistorySidebar @select-session="handleSidebarSelectSession" />
    </aside>

    <!-- Right: Main Chat Panel -->
    <div class="chat-main-panel">
      <!-- Panel Header -->
      <header class="chat-panel-header">
        <div class="chat-panel-header-left">
          <span class="chat-panel-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-4 5-2-2-4-3-4-5a4 4 0 0 1 4-4z"/>
              <path d="M12 12v6"/>
              <path d="M8 22h8"/>
            </svg>
          </span>
          <div>
            <strong class="chat-panel-title">{{ getSessionTitle() }}</strong>
            <span class="chat-panel-subtitle">동기화된 지식에 대해 질문합니다.</span>
          </div>
        </div>
        <div class="chat-panel-header-right">
          <span class="status-pill" :class="{ connected: isConnected }">
            <span class="status-dot" :class="{ active: isConnected }"></span>
            {{ isConnected ? '실시간 연동 중' : '연결되지 않음' }}
          </span>
        </div>
      </header>

      <!-- Messages Area -->
      <div class="chat-messages-area">
        <!-- Empty State -->
        <section v-if="chatStore.messages.length === 0 && !error" class="chat-empty">
          <div class="chat-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="9" y1="10" x2="15" y2="10"/>
              <line x1="9" y1="13" x2="13" y2="13"/>
            </svg>
          </div>
          <h2 class="chat-empty-title">어떤 도움이 필요하신가요?</h2>
          <p class="chat-empty-desc">워크스페이스에 연동된 문서, Git 커밋, DB 스키마 지식을 실시간으로 검색하여 답변을 구성합니다.</p>
          <span class="status-pill" :class="{ connected: isConnected }" style="margin-top:4px">
            <span class="status-dot" :class="{ active: isConnected }"></span>
            {{ isConnected ? '실시간 연동 중' : '연결되지 않음' }}
          </span>
          <div class="chat-suggestions">
            <button class="suggestion-chip" @click="handleSuggestionClick('프로젝트 문서 요약해 줘')">프로젝트 문서 요약해 줘</button>
            <button class="suggestion-chip" @click="handleSuggestionClick('최근 커밋 변경사항이 뭐야?')">최근 커밋 변경사항이 뭐야?</button>
            <button class="suggestion-chip" @click="handleSuggestionClick('DB 스키마 구조 알려줘')">DB 스키마 구조 알려줘</button>
          </div>
        </section>

        <!-- Error State (when no messages but error) -->
        <section v-else-if="error && chatStore.messages.length === 0" class="chat-empty">
          <div class="chat-empty-icon" style="background:var(--danger-bg);color:var(--danger-text)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 class="chat-empty-title">연결에 실패했습니다</h2>
          <p class="chat-empty-desc">서버와의 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.</p>
        </section>

        <!-- Message Stream -->
        <MessageList
          v-else
          :messages="chatStore.messages"
          :streaming-message="chatStore.streamingMessage"
          :is-searching="chatStore.isSearching"
          :is-generating="chatStore.isGenerating"
        />
      </div>

      <!-- Input Area -->
      <footer class="chat-input-area">
        <form class="chat-input-form" @submit.prevent="handleSend">
          <div class="chat-input-wrap" :class="{ focused: isInputFocused, disconnected: !isConnected }">
            <textarea
              ref="textareaRef"
              v-model="inputText"
              class="chat-input-box"
              rows="1"
              placeholder="동기화된 지식에 대해 물어보세요..."
              @keydown="handleKeydown"
              @compositionstart="isComposing = true"
              @compositionend="isComposing = false"
              @input="resizeTextarea"
              @focus="isInputFocused = true"
              @blur="isInputFocused = false"
            ></textarea>
            <div class="chat-input-bar">
              <div class="chat-input-status">
                <span class="status-dot" :class="{ active: isConnected }"></span>
                <span v-if="error" class="status-error">{{ error }}</span>
                <span v-else>{{ isConnected ? '실시간 연동 중' : '연결되지 않음' }}</span>
              </div>
              <div class="chat-input-actions">
                <div class="chat-plus-wrap">
                  <button type="button" class="chat-plus-btn" @click="togglePlusMenu" aria-label="추가 기능">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                  <div v-if="showPlusMenu" class="chat-plus-menu">
                    <button type="button" class="chat-plus-menu-item" @click="openDirectQuestion">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      담당자에게 질문
                    </button>
                  </div>
                </div>
                <button type="submit" class="chat-send-btn" :disabled="!inputText.trim() || !isConnected" aria-label="전송">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="5 14 12 7 19 14"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </form>

        <!-- Owner Confirmation -->
        <OwnerConfirmationCard
          :owner-name="chatStore.pendingOwnerConfirmation?.ownerName || null"
          @confirm="handleOwnerConfirm"
          @cancel="handleOwnerCancel"
        />
      </footer>

      <!-- Owner Push Toast -->
      <OwnerAnswerToast />

      <!-- Direct Question Modal -->
      <DirectQuestionModal
        :is-open="showDirectQuestion"
        @close="showDirectQuestion = false"
        @sent="handleDirectQuestionSent"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-input-actions { display: flex; align-items: center; gap: 6px; }
.chat-plus-wrap { position: relative; display: flex; align-items: center; }
.chat-plus-btn {
  width: 34px; height: 34px; padding: 0;
  background: var(--brand-indigo, #5B52E3); color: #fff;
  border: 0; border-radius: 9px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: all .15s;
}
.chat-plus-btn:hover { background: #4A43C9; transform: translateY(-1px); }
.chat-plus-btn svg { width: 16px; height: 16px; }
.chat-plus-menu {
  position: absolute; bottom: 42px; right: 0; z-index: 20;
  background: var(--card-bg, #fff); border: 1px solid var(--card-border, #E8EAF2); border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12); padding: 4px 0; min-width: 180px;
}
.chat-plus-menu-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 10px 16px; border: none; background: none; cursor: pointer;
  font-size: 13px; color: var(--text-body, #1B2031); white-space: nowrap; font-family: var(--font-ui);
}
.chat-plus-menu-item:hover { background: var(--brand-light, #F0F2FE); color: var(--brand-indigo, #5B52E3); }

.chat-shell {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 20px;
  height: calc(100vh - 56px);
  padding: 20px 28px 20px;
  background: var(--page-bg, #F6F7FB);
}
.chat-history-panel {
  border-radius: 16px;
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #E8EAF2);
  overflow: hidden;
}
.chat-main-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 16px;
  background: var(--card-bg, #fff);
  border: 1px solid var(--card-border, #E8EAF2);
  overflow: hidden;
}
.chat-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--card-border, #E8EAF2);
  flex-shrink: 0;
}
.chat-panel-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.chat-panel-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--brand-light, #F0F2FE);
  color: var(--brand-indigo, #5B52E3);
  display: grid; place-items: center; flex-shrink: 0;
}
.chat-panel-icon svg { width: 18px; height: 18px; }
.chat-panel-title { display: block; font-size: 14px; font-weight: 700; color: var(--text-body, #1B2031); line-height: 1.3; }
.chat-panel-subtitle { font-size: 11px; color: var(--text-light, #9AA0BD); }
.chat-panel-header-right { display: flex; align-items: center; gap: 10px; }

.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 12px; border-radius: 999px;
  font-size: 11px; font-weight: 600; white-space: nowrap;
  background: var(--page-bg, #F6F7FB); color: var(--text-light, #9AA0BD);
}
.status-pill.connected { background: rgba(52,199,89,.1); color: #1FAB4A; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: #ccc; flex-shrink: 0; }
.status-dot.active { background: #34C759; }

.chat-messages-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 0; min-height: 0; }
.chat-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 32px; text-align: center; gap: 6px; height: 100%;
}
.chat-empty-icon {
  width: 64px; height: 64px; border-radius: 16px;
  background: var(--brand-light, #F0F2FE);
  color: var(--brand-indigo, #5B52E3);
  display: grid; place-items: center; margin-bottom: 4px;
}
.chat-empty-icon svg { width: 28px; height: 28px; }
.chat-empty-title { font-size: 18px; font-weight: 700; color: var(--text-body, #1B2031); margin: 0; }
.chat-empty-desc { font-size: 13px; color: var(--text-secondary, #6B7191); max-width: 420px; line-height: 1.6; margin: 0; }

.chat-suggestions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 12px; }
.suggestion-chip {
  padding: 8px 16px; border-radius: 999px;
  background: var(--card-bg, #fff); color: var(--text-secondary, #6B7191);
  border: 1px solid var(--card-border, #E8EAF2);
  font-family: var(--font-ui); font-size: 12px; font-weight: 500; cursor: pointer;
  transition: all .15s;
}
.suggestion-chip:hover { border-color: var(--brand-indigo, #5B52E3); color: var(--brand-indigo, #5B52E3); background: var(--brand-light, #F0F2FE); transform: translateY(-1px); }

.chat-input-area { flex-shrink: 0; padding: 16px 24px 20px; border-top: 1px solid var(--card-border, #E8EAF2); }
.chat-input-form { max-width: 100%; }
.chat-input-wrap {
  display: flex; flex-direction: column;
  border: 1px solid var(--card-border, #E8EAF2);
  border-radius: 14px; background: var(--page-bg, #F6F7FB);
  transition: border-color .15s, background .15s; overflow: visible;
}
.chat-input-wrap.focused { border-color: var(--brand-indigo, #5B52E3); background: var(--card-bg, #fff); box-shadow: 0 0 0 3px rgba(91,82,227,.1); }
.chat-input-wrap.disconnected { border-color: var(--danger-text, #D45D5D); }
.chat-input-box {
  flex: 1; min-height: 20px; max-height: 140px;
  padding: 14px 16px 4px; border: none;
  font-family: var(--font-ui); font-size: 13px; line-height: 1.5;
  outline: none; background: transparent; resize: none; overflow-y: auto;
}
.chat-input-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 6px 8px 14px;
}
.chat-input-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-light, #9AA0BD); }
.chat-input-status .status-error { color: var(--danger-text, #D45D5D); }
.chat-send-btn {
  width: 34px; height: 34px; padding: 0;
  background: var(--brand-indigo, #5B52E3); color: #fff;
  border: 0; border-radius: 9px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: all .15s;
}
.chat-send-btn:hover:not(:disabled) { background: #4A43C9; transform: translateY(-1px); }
.chat-send-btn:disabled { background: var(--card-border, #E8EAF2); color: var(--text-light, #9AA0BD); cursor: not-allowed; }

@media (max-width:960px) {
  .chat-shell { grid-template-columns: 1fr; padding: 14px; height: calc(100vh - 48px); }
  .chat-history-panel { display: none; }
}
</style>
