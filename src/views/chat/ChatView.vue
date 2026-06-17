<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import MessageList from '@/components/chat/MessageList.vue'
import OwnerConfirmationCard from '@/components/chat/OwnerConfirmationCard.vue'
import OwnerAnswerToast from '@/components/chat/OwnerAnswerToast.vue'
import { useChatStore } from '@/state/chatStore'
import '@/assets/styles/chat.css'

const route = useRoute()
const chatStore = useChatStore()

// Get workspaceId from URL params
const workspaceId = computed(() => {
  const value = route.params.workspaceId
  return Array.isArray(value) ? value[0] : value || 'default'
})

// Inject the global shared WebSocket connection
const ws = inject<{
  isConnected: { value: boolean }
  error: { value: string | null }
  sendMessage: (content: string) => void
  sendOwnerConfirmation: (messageId: string, ownerId: string) => void
}>('workspace-websocket')

const isConnected = computed(() => ws?.isConnected.value ?? false)
const error = computed(() => ws?.error.value ?? null)

const inputText = ref('')

function handleSend() {
  if (!inputText.value.trim() || !ws) return
  ws.sendMessage(inputText.value.trim())
  inputText.value = ''
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

onMounted(() => {
  // Chat history is preserved when navigating within the same workspace
})
</script>

<template>
  <AppLayout>
    <div class="chat-page">
      <!-- Chat Hero Header -->
      <section class="chat-hero">
        <div>
          <h1>RAG 동기화 지식 챗봇</h1>
          <p>
            워크스페이스에 연동된 문서, Git 커밋, DB 스키마 지식을 실시간으로
            검색하여 답변을 구성합니다.
          </p>
        </div>
        <div v-if="error" class="connection-status error" style="font-size: 12px; color: #fca5a5; font-weight: 800;">
          ⚠️ {{ error }}
        </div>
        <div v-else class="connection-status" style="font-size: 12px; opacity: 0.8; font-weight: 800;">
          {{ isConnected ? '🟢 실시간 연동 중' : '🔴 연결되지 않음' }}
        </div>
      </section>

      <!-- Message Viewport -->
      <MessageList
        :messages="chatStore.messages"
        :streaming-message="chatStore.streamingMessage"
        :is-searching="chatStore.isSearching"
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
          <input
            v-model="inputText"
            type="text"
            class="chat-input-box"
            placeholder="동기화된 지식에 대해 물어보세요... ('담당자' 또는 'owner' 입력 시 호출 시나리오 시작)"
            aria-label="채팅 입력창"
          />
          <button
            type="submit"
            class="chat-send-button"
            :disabled="!inputText.trim() || !isConnected"
          >
            전송
          </button>
        </form>
      </footer>

      <!-- Owner Push Toast Notification -->
      <OwnerAnswerToast />
    </div>
  </AppLayout>
</template>
