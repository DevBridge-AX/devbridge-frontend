import { chatApi } from '@/api/chatApi'
import { useChatStore } from '@/state/chatStore'
import { watch } from 'vue'
import { storeToRefs } from 'pinia'

// ─── Layer 3: Chat Service ─────────────────────────────────────────────────
// API 통신 및 전역 상태(Pinia) 업데이트 등 비즈니스 로직을 담당합니다.

export const chatService = {
  /**
   * 전체 세션 목록을 불러옵니다.
   */
  async loadSessions() {
    const chatStore = useChatStore()
    const sessions = await chatApi.getSessions()
    chatStore.setSessions(sessions)
  },

  /**
   * 새로운 세션을 생성하고 활성화합니다.
   */
  async createSession(title?: string) {
    const chatStore = useChatStore()
    const newSession = await chatApi.createSession(title)
    
    // 세션 목록 갱신
    await this.loadSessions()
    
    // 현재 세션 이동
    chatStore.setActiveSessionId(newSession.id)
    chatStore.resetChat()
    
    return newSession
  },

  /**
   * 특정 세션을 삭제합니다.
   */
  async deleteSession(sessionId: string) {
    const chatStore = useChatStore()
    await chatApi.deleteSession(sessionId)
    await this.loadSessions()

    // 만약 현재 활성화된 세션을 지웠다면 초기화
    if (chatStore.activeSessionId === sessionId) {
      chatStore.setActiveSessionId(null)
      chatStore.resetChat()
    }
  },

  /**
   * 특정 세션의 메시지를 불러오고 활성화합니다.
   */
  async loadSessionMessages(sessionId: string) {
    const chatStore = useChatStore()
    chatStore.resetChat() // 상태 초기화

    const messages = await chatApi.getMessages(sessionId)
    chatStore.setMessages(messages)
    chatStore.setActiveSessionId(sessionId)
  },

  /**
   * 현재 세션의 메시지를 로컬 스토리지에 저장합니다. (Mock 전용)
   */
  async saveCurrentSessionMessages() {
    const chatStore = useChatStore()
    const sessionId = chatStore.activeSessionId
    if (!sessionId) return

    await chatApi.saveMessages(sessionId, chatStore.messages)
    // 세션 목록(제목, 시간 업데이트 등)도 동기화하기 위해 다시 로드
    await this.loadSessions()
  },

  /**
   * 스토어의 messages가 변경될 때마다 자동으로 로컬에 저장하도록 구독을 설정합니다.
   * AppLayout 등 전역에서 한 번만 호출하면 됩니다.
   */
  initAutoSave() {
    const chatStore = useChatStore()
    const { messages } = storeToRefs(chatStore)

    watch(messages, () => {
      // 메시지 목록이 비어있지 않고, 현재 활성화된 세션이 있을 때만 저장
      if (chatStore.activeSessionId && chatStore.messages.length > 0) {
        this.saveCurrentSessionMessages()
      }
    }, { deep: true })
  }
}
