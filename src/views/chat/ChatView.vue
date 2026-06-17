<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
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

async function handleSend() {
  if (!inputText.value.trim() || !ws) return
  
  // 만약 현재 활성화된 세션이 없다면 새로 생성 (첫 메시지 전송 시)
  if (!chatStore.activeSessionId) {
    const newSession = await chatService.createSession()
    // URL 업데이트 (동기적으로 처리하여 사용자 경험 향상)
    router.replace({ query: { ...route.query, session: newSession.id } })
  }

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

onMounted(async () => {
  // 세션 목록 로드 및 자동 저장 설정
  await chatService.loadSessions()
  chatService.initAutoSave()
  
  if (route.query.session) {
    await chatService.loadSessionMessages(route.query.session as string)
  }
})

// Query Params의 session 변경 감지하여 데이터 로드
watch(() => route.query.session, async (newSessionId) => {
  if (newSessionId) {
    await chatService.loadSessionMessages(newSessionId as string)
  } else {
    // 세션이 선택되지 않았을 경우 상태 초기화
    chatStore.setActiveSessionId(null)
    chatStore.resetChat()
  }
})
</script>

<template>
  <AppLayout>
    <div class="chat-container-layout">
      <!-- Sidebar for Chat History -->
      <ChatHistorySidebar />

      <!-- Main Chat Area -->
      <div class="chat-page">
        <!-- Chat Hero Header (only show when no messages to give focus to input) -->
        <section v-if="chatStore.messages.length === 0" class="chat-hero">
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
          v-else
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
    </div>
  </AppLayout>
</template>

<style scoped>
.chat-container-layout {
  display: flex;
  height: 100%;
  width: 100%;
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
