<script setup lang="ts">
import { ref, computed, inject, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/state/chatStore'
import { chatService } from '@/services/chatService'
import MessageList from './MessageList.vue'
import OwnerConfirmationCard from './OwnerConfirmationCard.vue'
import OwnerAnswerToast from './OwnerAnswerToast.vue'
import ChatHistorySidebar from './ChatHistorySidebar.vue'
import '@/assets/styles/chat.css'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()

// State
const isOpen = ref(false)
const isMaximized = ref(false)
const showSidebar = ref(true)
const inputText = ref('')
const hasNewAnswer = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isComposing = ref(false)
const isInputFocused = ref(false)

const workspaceId = computed<string>(() => {
  const value = route.params.workspaceId
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return value || ''
})

// Inject shared WebSocket
const ws = inject<{
  isConnected: { value: boolean }
  error: { value: string | null }
  sendMessage: (content: string) => void
  sendOwnerConfirmation: (messageId: string, ownerId: string) => void
}>('workspace-websocket')

const isConnected = computed(() => ws?.isConnected.value ?? false)
const error = computed(() => ws?.error.value ?? null)

function toggleWidget() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    hasNewAnswer.value = false
  }
}

function toggleMaximize() {
  isMaximized.value = !isMaximized.value
  if (isMaximized.value) {
    showSidebar.value = true
  }
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

async function handleSend() {
  if (!inputText.value.trim() || !ws) return
  if (!chatStore.activeSessionId) {
    await chatService.createSession()
  }
  ws.sendMessage(inputText.value.trim())
  inputText.value = ''
  nextTick(() => {
    resizeTextarea()
    textareaRef.value?.focus()
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

function goToFullChat() {
  isOpen.value = false
  if (workspaceId.value) {
    router.push(`/workspaces/${workspaceId.value}/chat`)
  }
}

function handleAnswerReceived() {
  if (!isOpen.value) {
    hasNewAnswer.value = true
  }
}

async function handleSidebarSelectSession(sessionId: string) {
  if (sessionId) {
    await chatService.loadSessionMessages(sessionId)
  } else {
    chatStore.setActiveSessionId(null)
    chatStore.resetChat()
  }
}

onMounted(() => {
  window.addEventListener('owner-answer', handleAnswerReceived)
})

onUnmounted(() => {
  window.removeEventListener('owner-answer', handleAnswerReceived)
})
</script>

<template>
  <Teleport to="body">
    <div class="floating-chat-widget">
    <!-- Floating Action Button (FAB) -->
    <button
      type="button"
      class="chat-fab"
      :class="{ 'chat-fab-pulse': hasNewAnswer }"
      :aria-label="isOpen ? '채팅창 닫기' : 'AI 어시스턴트 열기'"
      @click="toggleWidget"
    >
      <span v-if="isOpen">✖</span>
      <span v-else>💬</span>
    </button>

    <!-- Picture-in-Picture (PIP) Panel -->
    <div
      v-if="isOpen"
      class="chat-pip-panel"
      :class="{ maximized: isMaximized, 'sidebar-open': isMaximized && showSidebar }"
    >
      <!-- PIP Header -->
      <header class="chat-pip-header">
        <div class="chat-pip-title-wrapper">
          <!-- Sidebar Toggle Menu Button -->
          <button
            v-if="isMaximized"
            type="button"
            class="chat-pip-btn sidebar-toggle-btn"
            :class="{ 'sidebar-active': showSidebar }"
            title="대화 기록 토글"
            @click="showSidebar = !showSidebar"
          >
            ☰
          </button>
          <div class="chat-pip-title">
            <strong>AI Assistant</strong>
            <span>{{ isConnected ? '🟢 실시간 연동 중' : '🔴 연결 끊김' }}</span>
          </div>
        </div>
        <div class="chat-pip-controls">
          <!-- Size Toggle Button -->
          <button
            type="button"
            class="chat-pip-btn"
            title="크기 변경"
            @click="toggleMaximize"
          >
            ❐
          </button>
          <!-- Full Page Transition Button -->
          <button
            type="button"
            class="chat-pip-btn"
            title="전체 화면으로 열기"
            @click="goToFullChat"
          >
            ↗
          </button>
          <!-- Minimize Panel Button -->
          <button
            type="button"
            class="chat-pip-btn"
            title="닫기"
            @click="toggleWidget"
          >
            _
          </button>
        </div>
      </header>

      <!-- PIP Body Wrapper -->
      <div class="chat-pip-body">
        <ChatHistorySidebar 
          v-if="isMaximized" 
          class="pip-sidebar" 
          :class="{ 'pip-sidebar-collapsed': !showSidebar }"
          @select-session="handleSidebarSelectSession"
        />

        <div class="chat-pip-main">
          <!-- Message Viewport -->
          <MessageList
            :messages="chatStore.messages"
            :streaming-message="chatStore.streamingMessage"
            :is-searching="chatStore.isSearching"
            :is-generating="chatStore.isGenerating"
          />

          <!-- Floating Owner Confirmation suggestion inside PIP -->
          <OwnerConfirmationCard
            :owner-name="chatStore.pendingOwnerConfirmation?.ownerName || null"
            @confirm="handleOwnerConfirm"
            @cancel="handleOwnerCancel"
          />

          <!-- Message Input Form Panel inside PIP -->
          <footer class="chat-footer">
            <form class="chat-input-container" @submit.prevent="handleSend">
              <div class="chat-input-wrapper" :class="{ focused: isInputFocused, disconnected: !isConnected }">
                <textarea
                  ref="textareaRef"
                  v-model="inputText"
                  class="chat-input-box"
                  rows="1"
                  placeholder="AI에게 질문해보세요..."
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
                    <span v-else class="status-label">{{ isConnected ? '연동 중' : '연결 끊김' }}</span>
                  </div>
                  <button
                    type="submit"
                    class="chat-send-button"
                    :disabled="!inputText.trim() || !isConnected"
                    aria-label="전송"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5"></line>
                      <polyline points="5 12 12 5 19 12"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </footer>
        </div>
      </div>
    </div>

    <!-- Background Toast Overlay (Triggered on other pages) -->
    <OwnerAnswerToast v-if="!isOpen" />
  </div>
  </Teleport>
</template>
