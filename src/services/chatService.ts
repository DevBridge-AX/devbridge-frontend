import { chatApi, usesLocalStore } from '@/api/chatApi'
import { toApiError } from '@/api/apiError'
import { purgeLegacyChatStorage } from '@/mocks/chatSessionMock'
import { useChatStore } from '@/state/chatStore'
import { useWorkspaceStore } from '@/state/workspaceStore'
import { watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'

// ─── Layer 3: Chat Service ─────────────────────────────────────────────────
// API 통신 및 전역 상태(Pinia) 업데이트 등 비즈니스 로직을 담당합니다.

let loadedSessionsKey: string | null = null
let autoSaveInitialized = false
let isLoadingSession = false
let legacyStoragePurged = false

const DEFAULT_SESSION_TITLE = '새로운 대화'
const SESSION_TITLE_MAX_LENGTH = 20

// 첫 메시지로 세션 제목 생성 (20자 초과 시 말줄임)
function toSessionTitle(text?: string): string {
  if (!text) return DEFAULT_SESSION_TITLE
  return text.length > SESSION_TITLE_MAX_LENGTH
    ? text.substring(0, SESSION_TITLE_MAX_LENGTH) + '...'
    : text
}

export const chatService = {
  /**
   * @throws ApiError 목록 조회 실패 시
   */
  async loadSessions(force = false) {
    // 실제 모드의 세션 목록은 워크스페이스별이므로 워크스페이스가 바뀌면 다시 불러옴
    const sessionsKey = usesLocalStore ? 'local' : (useWorkspaceStore().currentWorkspaceId ?? '')
    if (!force && loadedSessionsKey === sessionsKey) return
    const chatStore = useChatStore()

    try {
      const allSessions = await chatApi.getSessions()

      if (usesLocalStore) {
        // Mock 모드: 메시지가 없는 세션은 목록에서 제외
        const hasMessages = await Promise.all(
          allSessions.map(async (session) => {
            const messages = await chatApi.getMessages(session.id)
            return messages.length > 0
          })
        )
        chatStore.setSessions(allSessions.filter((_, i) => hasMessages[i]))
      } else {
        // 실제 모드: 서버 목록을 그대로 사용하고, 이전 LocalStorage 사본은 1회 정리
        if (!legacyStoragePurged) {
          purgeLegacyChatStorage()
          legacyStoragePurged = true
        }
        chatStore.setSessions(allSessions)
      }
      loadedSessionsKey = sessionsKey
    } catch (error) {
      throw toApiError(error, '대화 목록을 불러오지 못했습니다.')
    }
  },

  /**
   * @param firstMessage 첫 메시지 (세션 제목 생성에 사용)
   * @throws ApiError 세션 생성 실패 시
   */
  async createSession(firstMessage?: string) {
    const chatStore = useChatStore()

    chatStore.cacheCurrentSession()

    try {
      const newSession = await chatApi.createSession(toSessionTitle(firstMessage))

      chatStore.resetChat()
      chatStore.setActiveSessionId(newSession.id)

      // 실제 모드는 자동 저장이 없으므로 사이드바 목록을 직접 갱신
      // (세션은 이미 생성됐으므로 목록 갱신 실패는 대화 시작을 막지 않음)
      if (!usesLocalStore) {
        await this.loadSessions(true).catch(() => {})
      }

      return newSession
    } catch (error) {
      throw toApiError(error, '대화를 시작하지 못했습니다.')
    }
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

  /**
   * @throws ApiError 메시지 조회 실패 시
   */
  async loadSessionMessages(sessionId: string) {
    const chatStore = useChatStore()

    if (chatStore.activeSessionId === sessionId) {
      return
    }

    isLoadingSession = true

    try {
      chatStore.cacheCurrentSession()

      const cached = chatStore.getCachedMessages(sessionId)
      if (cached) {
        chatStore.resetChat()
        chatStore.setActiveSessionId(sessionId)
        chatStore.setMessages(cached)
        await nextTick()
        return
      }

      chatStore.resetChat()
      chatStore.setActiveSessionId(sessionId)

      const messages = await chatApi.getMessages(sessionId)
      chatStore.setMessages(messages)
      await nextTick()
    } catch (error) {
      throw toApiError(error, '대화 내용을 불러오지 못했습니다.')
    } finally {
      isLoadingSession = false
    }
  },

  setInputText(text: string) {
    useChatStore().setInputText(text)
  },

  clearPendingOwnerConfirmation() {
    useChatStore().clearPendingOwnerConfirmation()
  },

  // 현재 세션을 캐시한 뒤 활성 세션 없이 새 대화 상태로 초기화
  startNewChat() {
    const chatStore = useChatStore()
    chatStore.cacheCurrentSession()
    chatStore.setActiveSessionId(null)
    chatStore.resetChat()
  },

  // 캐시 없이 활성 세션을 해제하고 대화 상태를 초기화
  resetActiveSession() {
    const chatStore = useChatStore()
    chatStore.setActiveSessionId(null)
    chatStore.resetChat()
  },

  async saveCurrentSessionMessages() {
    if (!usesLocalStore) return

    const chatStore = useChatStore()
    const sessionId = chatStore.activeSessionId
    if (!sessionId) return

    await chatApi.saveMessages(sessionId, chatStore.messages)
    await this.loadSessions(true)
  },

  // Mock 모드 전용: 실제 모드는 백엔드가 메시지를 저장하므로 자동 저장을 등록하지 않음
  initAutoSave() {
    if (!usesLocalStore) return
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
