import axiosClient from './axiosClient'
import type { ChatMessage } from '@/state/chatStore'

// ─── Layer 1: Chat API ─────────────────────────────────────────────────
// VITE_WS_MOCK=true: LocalStorage Mock
// VITE_WS_MOCK=false: 세션 생성은 백엔드 REST API, 나머지는 LocalStorage 유지

export interface ChatSession {
  id: string
  title: string
  updatedAt: string
}

interface CreateSessionApiResponse {
  id: string
  workspaceId: string
  employeeId: string
  sessionTitle: string
}

const isMock = import.meta.env.VITE_WS_MOCK === 'true'

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
   * Mock 모드: LocalStorage에 저장
   * 실제 모드: POST /api/chats/sessions 호출
   */
  async createSession(title: string = '새로운 대화'): Promise<ChatSession> {
    if (isMock) {
      const sessions = await this.getSessions()
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title,
        updatedAt: new Date().toISOString(),
      }
      sessions.push(newSession)
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
      return newSession
    }

    const res = await axiosClient.post<CreateSessionApiResponse>('/api/chats/sessions', {
      sessionTitle: title,
    })
    const data = res.data
    const newSession: ChatSession = {
      id: data.id,
      title: data.sessionTitle,
      updatedAt: new Date().toISOString(),
    }
    const sessions = await this.getSessions()
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
