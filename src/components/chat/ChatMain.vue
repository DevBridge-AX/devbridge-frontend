<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MessageList from '@/components/chat/MessageList.vue'
import OwnerConfirmationCard from '@/components/chat/OwnerConfirmationCard.vue'
import OwnerAnswerToast from '@/components/chat/OwnerAnswerToast.vue'
import ChatHistorySidebar from '@/components/chat/ChatHistorySidebar.vue'
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
  if (el) {
    el.style.height = 'auto'
  }

  nextTick(() => {
    textareaRef.value?.focus()
  })
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
</script>

<template>
  <div class="chat-container-layout">
    <!-- Sidebar for Chat History -->
    <ChatHistorySidebar @select-session="handleSidebarSelectSession" />

    <!-- Main Chat Area -->
    <div class="chat-page">
      <!-- Welcome Empty State -->
      <section v-if="chatStore.messages.length === 0" class="chat-welcome">
        <div class="welcome-content">
          <div class="welcome-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <line x1="9" y1="10" x2="15" y2="10"></line>
              <line x1="9" y1="13" x2="13" y2="13"></line>
            </svg>
          </div>
          <h1 class="welcome-title">어떤 도움이 필요하신가요?</h1>
          <p class="welcome-description">
            워크스페이스에 연동된 문서, Git 커밋, DB 스키마 지식을<br>
            실시간으로 검색하여 답변을 구성합니다.
          </p>
          <div v-if="error" class="welcome-status welcome-status-error">{{ error }}</div>
          <div v-else class="welcome-status">
            <span class="status-dot" :class="{ active: isConnected }"></span>
            {{ isConnected ? '실시간 연동 중' : '연결되지 않음' }}
          </div>
          <div class="suggestion-chips">
            <button class="suggestion-chip" @click="handleSuggestionClick('프로젝트 문서 요약해 줘')">
              프로젝트 문서 요약해 줘
            </button>
            <button class="suggestion-chip" @click="handleSuggestionClick('최근 커밋 변경사항이 뭐야?')">
              최근 커밋 변경사항이 뭐야?
            </button>
            <button class="suggestion-chip" @click="handleSuggestionClick('DB 스키마 구조 알려줘')">
              DB 스키마 구조 알려줘
            </button>
          </div>
        </div>
      </section>

      <!-- Message Viewport -->
      <MessageList
        v-else
        :messages="chatStore.messages"
        :streaming-message="chatStore.streamingMessage"
        :is-searching="chatStore.isSearching"
        :is-generating="chatStore.isGenerating"
      />

      <!-- Floating Owner Confirmation suggestion -->
      <OwnerConfirmationCard
        :owner-name="chatStore.pendingOwnerConfirmation?.ownerName || null"
        @confirm="handleOwnerConfirm"
        @cancel="handleOwnerCancel"
      />

      <!-- Message Input Form Panel -->
      <footer class="chat-footer">
        <form class="chat-input-container" @submit.prevent="handleSend">
          <div class="chat-input-wrapper" :class="{ focused: isInputFocused, disconnected: !isConnected }">
            <textarea
              ref="textareaRef"
              v-model="inputText"
              class="chat-input-box"
              rows="1"
              placeholder="동기화된 지식에 대해 물어보세요... ('담당자' 또는 'owner' 입력 시 호출 시나리오 시작)"
              aria-label="채팅 입력창"
              @keydown="handleKeydown"
              @compositionstart="isComposing = true"
              @compositionend="isComposing = false"
              @input="resizeTextarea"
              @focus="isInputFocused = true"
              @blur="isInputFocused = false"
            ></textarea>
            <div class="chat-input-bottom-bar">
              <div class="chat-connection-status" :class="{ connected: isConnected }">
                <span class="status-dot" :class="{ active: isConnected }"></span>
                <span v-if="error" class="status-label error">{{ error }}</span>
                <span v-else class="status-label">{{ isConnected ? '실시간 연동 중' : '연결되지 않음' }}</span>
              </div>
              <button
                type="submit"
                class="chat-send-button"
                :disabled="!inputText.trim() || !isConnected"
                aria-label="전송"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </form>
      </footer>

      <!-- Owner Push Toast Notification -->
      <OwnerAnswerToast />
    </div>
  </div>
</template>

<style scoped>
.chat-container-layout {
  display: flex;
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-color: var(--color-bg, #f8fafc);
}

.chat-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
}
</style>
