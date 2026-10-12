import { describe, expect, it } from 'vitest'
import { toChatMessage, toChatSession } from '@/api/chatApi'
import type { ChatMessageResponse, ChatSessionResponse } from '@/api/chatApi'

function makeSession(lastMessageAt: string | null): ChatSessionResponse {
  return {
    id: 's1',
    workspaceId: 'w1',
    employeeId: 'e1',
    sessionTitle: '제목',
    lastMessageAt,
  }
}

function makeMessage(senderType: ChatMessageResponse['senderType']): ChatMessageResponse {
  return {
    id: 'm1',
    sessionId: 's1',
    senderType,
    content: '내용',
    promptTokens: null,
    completionTokens: null,
  }
}

describe('toChatSession', () => {
  it('sessionTitle과 lastMessageAt을 title/updatedAt으로 매핑한다', () => {
    expect(toChatSession(makeSession('2026-01-01T10:00:00'))).toEqual({
      id: 's1',
      title: '제목',
      updatedAt: '2026-01-01T10:00:00',
    })
  })

  it('lastMessageAt이 null이면 updatedAt은 빈 문자열이다', () => {
    expect(toChatSession(makeSession(null)).updatedAt).toBe('')
  })
})

describe('toChatMessage', () => {
  it('USER는 user 역할로 매핑한다', () => {
    expect(toChatMessage(makeMessage('USER'))).toEqual({ id: 'm1', role: 'user', text: '내용' })
  })

  it('AI는 assistant 역할로 매핑한다', () => {
    const message = toChatMessage(makeMessage('AI'))
    expect(message.role).toBe('assistant')
    expect(message.isOwnerAnswer).toBeUndefined()
  })

  it('OWNER는 assistant 역할이며 isOwnerAnswer가 true이다', () => {
    const message = toChatMessage(makeMessage('OWNER'))
    expect(message.role).toBe('assistant')
    expect(message.isOwnerAnswer).toBe(true)
    expect(message.text).toBe('내용')
  })
})
