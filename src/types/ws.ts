import type { DoneEventPayload } from '@/state/chatStore'
import type { NotificationPayload } from '@/state/notificationStore'

// ─── WebSocket 서버 → 클라이언트 메시지 ──────────────────────────────────
// 서버 wire format(snake_case, type 문자열)을 그대로 따릅니다.

export type WsCitation = DoneEventPayload['citations'][number]

export interface WsSearchingMessage {
  type: 'searching'
}

export interface WsTokenMessage {
  type: 'token'
  message_id: string
  text: string
}

export interface WsDoneMessage {
  type: 'done'
  message_id: string
  citations?: WsCitation[]
  needs_owner_confirmation?: boolean
}

export interface WsOwnerConfirmationSuggestedMessage {
  type: 'owner_confirmation_suggested'
  message_id: string
  suggested_owner_id: string
  suggested_owner_name: string
}

export interface WsOwnerAnswerReceivedMessage {
  type: 'owner_answer_received'
  original_message_id: string
  confirmation_id: string
  content: string
  owner_name?: string
  workspace_id?: string
}

export interface WsErrorMessage {
  type: 'error'
  message_id?: string
  message?: string
}

export type WsNotificationMessage = NotificationPayload & { type: 'notification' }

export type WsServerMessage =
  | WsSearchingMessage
  | WsTokenMessage
  | WsDoneMessage
  | WsOwnerConfirmationSuggestedMessage
  | WsOwnerAnswerReceivedMessage
  | WsErrorMessage
  | WsNotificationMessage

const WS_SERVER_MESSAGE_TYPES: readonly string[] = [
  'searching',
  'token',
  'done',
  'owner_confirmation_suggested',
  'owner_answer_received',
  'error',
  'notification',
]

/** 파싱된 값이 알려진 type을 가진 서버 메시지인지 얕게 검사합니다. */
export function isWsServerMessage(value: unknown): value is WsServerMessage {
  if (typeof value !== 'object' || value === null) return false
  if (!('type' in value)) return false
  return typeof value.type === 'string' && WS_SERVER_MESSAGE_TYPES.includes(value.type)
}
