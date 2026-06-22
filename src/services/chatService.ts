import { chatApi } from '@/api/chatApi'
import { useChatStore } from '@/state/chatStore'
import { watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'

// ─── Layer 3: Chat Service ─────────────────────────────────────────────────
// API 통신 및 전역 상태(Pinia) 업데이트 등 비즈니스 로직을 담당합니다.

let sessionsLoaded = false
let autoSaveInitialized = false
let isLoadingSession = false

export const chatService = {
  async loadSessions(force = false) {
    if (!force && sessionsLoaded) return
    const chatStore = useChatStore()
    const allSessions = await chatApi.getSessions()

    const hasMessages = await Promise.all(
      allSessions.map(async (session) => {
        const messages = await chatApi.getMessages(session.id)
        return messages.length > 0
      })
    )

    chatStore.setSessions(allSessions.filter((_, i) => hasMessages[i]))
    sessionsLoaded = true
  },

  async createSession(title?: string) {
    const chatStore = useChatStore()

    chatStore.cacheCurrentSession()

    const newSession = await chatApi.createSession(title)

    chatStore.resetChat()
    chatStore.setActiveSessionId(newSession.id)

    return newSession
  },

  async deleteSession(sessionId: string) {
    const chatStore = useChatStore()
    await chatApi.deleteSession(sessionId)
    chatStore.clearSessionCache(sessionId)
    await this.loadSessions(true)

    if (chatStore.activeSessionId === sessionId) {
      chatStore.setActiveSessionId(null)
      chatStore.resetChat()
    }
  },

  async loadSessionMessages(sessionId: string) {
    const chatStore = useChatStore()

    if (chatStore.activeSessionId === sessionId) {
      return
    }

    isLoadingSession = true

    chatStore.cacheCurrentSession()

    const cached = chatStore.getCachedMessages(sessionId)
    if (cached) {
      chatStore.resetChat()
      chatStore.setActiveSessionId(sessionId)
      chatStore.setMessages(cached)
      await nextTick()
      isLoadingSession = false
      return
    }

    chatStore.resetChat()
    chatStore.setActiveSessionId(sessionId)

    const messages = await chatApi.getMessages(sessionId)
    chatStore.setMessages(messages)
    await nextTick()
    isLoadingSession = false
  },

  async saveCurrentSessionMessages() {
    const chatStore = useChatStore()
    const sessionId = chatStore.activeSessionId
    if (!sessionId) return

    await chatApi.saveMessages(sessionId, chatStore.messages)
    await this.loadSessions(true)
  },

  initAutoSave() {
    if (autoSaveInitialized) return
    autoSaveInitialized = true

    const chatStore = useChatStore()
    const { messages } = storeToRefs(chatStore)

    watch(messages, () => {
      if (!isLoadingSession && chatStore.activeSessionId && chatStore.messages.length > 0) {
        this.saveCurrentSessionMessages()
      }
    }, { deep: true })
  }
}
