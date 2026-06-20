import type { ChatMessage } from '@/state/chatStore'

// ─── Layer 1: Chat API (Mock) ───────────────────────────────────────────
// 서버 연동 전까지 LocalStorage를 사용하여 세션과 메시지 히스토리를 모킹합니다.

export interface ChatSession {
  id: string
  title: string
  updatedAt: string
}

const SESSIONS_KEY = 'mock_chat_sessions'
const getMessagesKey = (sessionId: string) => `mock_chat_messages_${sessionId}`

export const chatApi = {
  /**
   * 전체 채팅 세션 목록 조회
   */
  async getSessions(): Promise<ChatSession[]> {
    const data = localStorage.getItem(SESSIONS_KEY)
    if (!data) return []
    try {
      const sessions = JSON.parse(data) as ChatSession[]
      // 최신순 정렬
      return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } catch (e) {
      console.error('Failed to parse sessions', e)
      return []
    }
  },

  /**
   * 새로운 세션 생성
   */
  async createSession(title: string = '새로운 대화'): Promise<ChatSession> {
    const sessions = await this.getSessions()
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title,
      updatedAt: new Date().toISOString()
    }
    sessions.push(newSession)
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
    return newSession
  },

  /**
   * 세션 삭제
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.getSessions()
    const filtered = sessions.filter(s => s.id !== sessionId)
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered))
    localStorage.removeItem(getMessagesKey(sessionId))
  },

  /**
   * 특정 세션의 메시지 목록 조회
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const data = localStorage.getItem(getMessagesKey(sessionId))
    if (!data) return []
    try {
      return JSON.parse(data) as ChatMessage[]
    } catch (e) {
      console.error('Failed to parse messages', e)
      return []
    }
  },

  /**
   * 특정 세션의 메시지 저장 (전체 덮어쓰기 Mock)
   */
  async saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    localStorage.setItem(getMessagesKey(sessionId), JSON.stringify(messages))
    
    // Update session updatedAt
    const sessions = await this.getSessions()
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
}
