import axiosClient from './axiosClient'
import { chatSessionMock } from '@/mocks/chatSessionMock'
import type { ChatMessage } from '@/types/chat'

// ─── Layer 1: Chat API ─────────────────────────────────────────────────
// VITE_WS_MOCK=true: 세션/메시지를 LocalStorage Mock(src/mocks/chatSessionMock.ts)에 저장
// VITE_WS_MOCK=false: 세션/메시지 모두 백엔드 REST API(/api/chats)로 처리
//   (메시지는 백엔드 WebSocket 핸들러가 직접 저장하므로 FE는 저장하지 않음)

export interface ChatSession {
  id: string
  title: string
  updatedAt: string
}

export interface ChatSessionResponse {
  id: string
  workspaceId: string
  employeeId: string
  sessionTitle: string
  lastMessageAt: string | null
}

export interface ChatMessageResponse {
  id: string
  sessionId: string
  senderType: 'USER' | 'AI' | 'OWNER'
  content: string
  promptTokens: number | null
  completionTokens: number | null
}

const isMock = import.meta.env.VITE_WS_MOCK === 'true'

/** LocalStorage Mock 사용 여부 (true일 때만 FE가 메시지를 자동 저장함) */
export const usesLocalStore = isMock

export function toChatSession(res: ChatSessionResponse): ChatSession {
  return {
    id: res.id,
    title: res.sessionTitle,
    updatedAt: res.lastMessageAt ?? '',
  }
}

export function toChatMessage(res: ChatMessageResponse): ChatMessage {
  if (res.senderType === 'USER') {
    return { id: res.id, role: 'user', text: res.content }
  }
  if (res.senderType === 'OWNER') {
    return { id: res.id, role: 'assistant', text: res.content, isOwnerAnswer: true }
  }
  return { id: res.id, role: 'assistant', text: res.content }
}

export const chatApi = {
  /**
   * 전체 채팅 세션 목록 조회 (최신 메시지 순)
   * 실제 모드: GET /api/chats/sessions
   */
  async getSessions(): Promise<ChatSession[]> {
    if (isMock) return chatSessionMock.getSessions()

    const res = await axiosClient.get<ChatSessionResponse[]>('/api/chats/sessions')
    return res.data.map(toChatSession)
  },

  /**
   * 새로운 세션 생성
   * 실제 모드: POST /api/chats/sessions 호출
   */
  async createSession(title: string = '새로운 대화'): Promise<ChatSession> {
    if (isMock) return chatSessionMock.createSession(title)

    const res = await axiosClient.post<ChatSessionResponse>('/api/chats/sessions', {
      sessionTitle: title,
    })
    return toChatSession(res.data)
  },

  /**
   * 세션 삭제
   * 실제 모드: DELETE /api/chats/sessions/{sessionId} 호출
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (isMock) return chatSessionMock.deleteSession(sessionId)

    await axiosClient.delete(`/api/chats/sessions/${sessionId}`)
  },

  /**
   * 특정 세션의 메시지 목록 조회 (시간순)
   * 실제 모드: GET /api/chats/sessions/{sessionId}/messages
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    if (isMock) return chatSessionMock.getMessages(sessionId)

    const res = await axiosClient.get<ChatMessageResponse[]>(
      `/api/chats/sessions/${sessionId}/messages`,
    )
    return res.data.map(toChatMessage)
  },

  /**
   * 특정 세션의 메시지 저장 (전체 덮어쓰기)
   * 실제 모드: 백엔드 WebSocket 핸들러가 사용자/AI 메시지를 직접 저장하므로 아무 것도 하지 않음
   */
  async saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    if (!isMock) return

    await chatSessionMock.saveMessages(sessionId, messages)
  },
}
