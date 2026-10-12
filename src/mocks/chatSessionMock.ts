import type { ChatMessage } from '@/types/chat'
import type { ChatSession } from '@/api/chatApi'

// ─── Chat Session Mock ─────────────────────────────────────────────────
// VITE_WS_MOCK=true 일 때만 사용하는 LocalStorage 기반 세션/메시지 저장소입니다.

const SESSIONS_KEY = 'mock_chat_sessions'
const MESSAGES_KEY_PREFIX = 'mock_chat_messages_'
const getMessagesKey = (sessionId: string) => `${MESSAGES_KEY_PREFIX}${sessionId}`

async function getSessions(): Promise<ChatSession[]> {
  const data = localStorage.getItem(SESSIONS_KEY)
  if (!data) return []
  try {
    const sessions = JSON.parse(data) as ChatSession[]
    // 최신순 정렬
    return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  } catch {
    // 손상된 저장 데이터는 빈 목록으로 처리합니다.
    return []
  }
}

async function createSession(title: string = '새로운 대화'): Promise<ChatSession> {
  const sessions = await getSessions()
  const newSession: ChatSession = {
    id: crypto.randomUUID(),
    title,
    updatedAt: new Date().toISOString(),
  }
  sessions.push(newSession)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  return newSession
}

async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await getSessions()
  const filtered = sessions.filter(s => s.id !== sessionId)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered))
  localStorage.removeItem(getMessagesKey(sessionId))
}

async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const data = localStorage.getItem(getMessagesKey(sessionId))
  if (!data) return []
  try {
    return JSON.parse(data) as ChatMessage[]
  } catch {
    // 손상된 저장 데이터는 빈 목록으로 처리합니다.
    return []
  }
}

/**
 * 특정 세션의 메시지 저장 (전체 덮어쓰기)
 */
async function saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
  localStorage.setItem(getMessagesKey(sessionId), JSON.stringify(messages))

  // Update session updatedAt
  const sessions = await getSessions()
  const sessionIndex = sessions.findIndex(s => s.id === sessionId)
  if (sessionIndex !== -1) {
    const session = sessions[sessionIndex]
    if (session) {
      session.updatedAt = new Date().toISOString()
      // 첫 메시지인 경우 세션 제목 자동 생성 (임시)
      if (messages.length === 1 && session.title === '새로운 대화') {
        const firstMsg = messages[0]
        if (firstMsg) {
          session.title = firstMsg.text.length > 20 ? firstMsg.text.substring(0, 20) + '...' : firstMsg.text
        }
      }
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
    }
  }
}

export const chatSessionMock = {
  getSessions,
  createSession,
  deleteSession,
  getMessages,
  saveMessages,
}

/**
 * 실제 모드 전환 이전에 저장된 LocalStorage 채팅 데이터를 모두 제거합니다.
 */
export function purgeLegacyChatStorage(): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key !== null && key.startsWith(MESSAGES_KEY_PREFIX)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key))
  localStorage.removeItem(SESSIONS_KEY)
}
