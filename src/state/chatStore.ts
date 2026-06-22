import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatSession } from '@/api/chatApi'

export interface MessageCitation {
  sourceType: 'document' | 'git_commit' | 'db_schema'
  sourceId: number
  title: string
  similarityScore: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  citations?: MessageCitation[]
  isError?: boolean
  isOwnerAnswer?: boolean
  ownerName?: string
}

export interface PendingOwnerConfirmation {
  messageId: string
  ownerId: string
  ownerName: string
}

export interface DoneEventPayload {
  messageId: string
  citations: {
    source_type: 'document' | 'git_commit' | 'db_schema'
    source_id: number
    title: string
    similarity_score: number
  }[]
  needs_owner_confirmation: boolean
}

export interface OwnerConfirmationPayload {
  messageId: string
  suggestedOwnerId: string
  suggestedOwnerName: string
}

export interface OwnerAnswerPayload {
  originalMessageId: string
  content: string
}

// ─── Layer 2: Chat State (Pinia) ───────────────────────────────────────────
// 순수 메모리 상태만 관리합니다. api 직접 호출 금지.

export const useChatStore = defineStore('chat', () => {
  // ── State ──────────────────────────────────────────────────────────────
  const messages = ref<ChatMessage[]>([])
  const streamingMessage = ref<{ id: string; text: string } | null>(null)
  const isSearching = ref(false)
  const isGenerating = ref(false)
  const pendingOwnerConfirmation = ref<PendingOwnerConfirmation | null>(null)
  const sessions = ref<ChatSession[]>([])
  const activeSessionId = ref<string | null>(null)
  const inputText = ref('')
  const sessionMessageCache = ref<Record<string, ChatMessage[]>>({})

  // 김개발 등 담당자 매핑 저장용 (original_message_id -> ownerName)
  const messageOwnerMap = ref<Record<string, string>>({})

  // ── Actions ────────────────────────────────────────────────────────────

  function setSessions(newSessions: ChatSession[]): void {
    sessions.value = newSessions
  }

  function setActiveSessionId(id: string | null): void {
    activeSessionId.value = id
  }

  function setInputText(text: string): void {
    inputText.value = text
  }

  function cacheCurrentSession(): void {
    if (activeSessionId.value && messages.value.length > 0) {
      sessionMessageCache.value[activeSessionId.value] = [...messages.value]
    }
  }

  function getCachedMessages(sessionId: string): ChatMessage[] | null {
    return sessionMessageCache.value[sessionId] ?? null
  }

  function clearSessionCache(sessionId: string): void {
    delete sessionMessageCache.value[sessionId]
  }

  function setMessages(newMessages: ChatMessage[]): void {
    messages.value = newMessages
  }

  function addMessage(message: ChatMessage): void {
    messages.value.push(message)
  }

  function appendToken(text: string, messageId: string): void {
    isSearching.value = false
    isGenerating.value = true
    if (!streamingMessage.value || streamingMessage.value.id !== messageId) {
      streamingMessage.value = { id: messageId, text: '' }
    }
    streamingMessage.value.text += text
  }

  function finalizeMessage(doneEvent: DoneEventPayload): void {
    isSearching.value = false
    isGenerating.value = false

    const hasStreamedText = streamingMessage.value && streamingMessage.value.id === doneEvent.messageId

    if (hasStreamedText) {
      const citations: MessageCitation[] = doneEvent.citations.map((c) => ({
        sourceType: c.source_type,
        sourceId: c.source_id,
        title: c.title,
        similarityScore: c.similarity_score,
      }))

      const finalId = streamingMessage.value!.id
      const finalText = streamingMessage.value!.text

      streamingMessage.value = null

      addMessage({
        id: finalId,
        role: 'assistant',
        text: finalText,
        citations,
      })
    } else if (doneEvent.needs_owner_confirmation) {
      addMessage({
        id: doneEvent.messageId,
        role: 'assistant',
        text: '관련 문서 근거를 찾지 못했습니다. 담당자 확인이 필요합니다.',
      })
    }
  }

  function setOwnerConfirmation(event: OwnerConfirmationPayload): void {
    isSearching.value = false
    isGenerating.value = false
    
    // 스트리밍 중이던 메시지가 있다면 먼저 저장
    if (streamingMessage.value && streamingMessage.value.id === event.messageId) {
      addMessage({
        id: streamingMessage.value.id,
        role: 'assistant',
        text: streamingMessage.value.text,
        citations: [],
      })
      streamingMessage.value = null
    }

    pendingOwnerConfirmation.value = {
      messageId: event.messageId,
      ownerId: event.suggestedOwnerId,
      ownerName: event.suggestedOwnerName,
    }

    // 이름 매핑 저장
    messageOwnerMap.value[event.messageId] = event.suggestedOwnerName
  }

  function receiveOwnerAnswer(event: OwnerAnswerPayload): void {
    const ownerName = messageOwnerMap.value[event.originalMessageId] || '담당자'
    
    // 1. 해당 메시지 아래에 새로운 답변 메시지로 추가하거나 수정
    addMessage({
      id: `${event.originalMessageId}-answer`,
      role: 'assistant',
      text: event.content,
      isOwnerAnswer: true,
      ownerName,
    })
  }

  function clearPendingOwnerConfirmation(): void {
    pendingOwnerConfirmation.value = null
  }

  function setSearching(searching: boolean): void {
    isSearching.value = searching
  }

  function setError(messageId: string, errorText: string): void {
    isSearching.value = false
    isGenerating.value = false
    streamingMessage.value = null
    
    addMessage({
      id: messageId,
      role: 'assistant',
      text: errorText,
      isError: true,
    })
  }

  function resetChat(): void {
    messages.value = []
    streamingMessage.value = null
    isSearching.value = false
    isGenerating.value = false
    pendingOwnerConfirmation.value = null
    messageOwnerMap.value = {}
    inputText.value = ''
  }

  function deleteSessionLocal(sessionId: string): void {
    sessions.value = sessions.value.filter((s) => s.id !== sessionId)
    delete sessionMessageCache.value[sessionId]
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = null
      resetChat()
    }
  }

  function setGenerating(generating: boolean): void {
    isGenerating.value = generating
  }

  return {
    messages,
    streamingMessage,
    isSearching,
    isGenerating,
    pendingOwnerConfirmation,
    messageOwnerMap,
    sessions,
    activeSessionId,
    inputText,
    sessionMessageCache,
    setSessions,
    setActiveSessionId,
    setInputText,
    setGenerating,
    setMessages,
    addMessage,
    appendToken,
    finalizeMessage,
    setOwnerConfirmation,
    receiveOwnerAnswer,
    clearPendingOwnerConfirmation,
    setSearching,
    setError,
    resetChat,
    deleteSessionLocal,
    cacheCurrentSession,
    getCachedMessages,
    clearSessionCache,
  }
})
