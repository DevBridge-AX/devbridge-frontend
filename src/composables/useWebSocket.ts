import { ref, shallowRef, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { SESSION_EXPIRED_EVENT } from '@/api/apiError'
import { useAuthStore } from '@/state/authStore'
import { useChatStore } from '@/state/chatStore'
import { useNotificationStore } from '@/state/notificationStore'
import { notificationService } from '@/services/notificationService'
import { ownerConfirmationService } from '@/services/ownerConfirmationService'
import { isWsServerMessage } from '@/types/ws'
import type { WsMock } from '@/mocks/wsMock'

const MAX_RETRIES = 5
const AUTH_FAILURE_CODES = [1002, 1008, 4401]
const AUTH_EXPIRED_MESSAGE = '인증이 만료되었습니다. 다시 로그인해주세요.'

export function useWebSocket(sessionId: string | (() => string)) {
  const route = useRoute()
  const authStore = useAuthStore()
  const chatStore = useChatStore()
  const notificationStore = useNotificationStore()
  const socket = shallowRef<WebSocket | null>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  let retryCount = 0
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  // 사용자가 연결 유지를 원하는 상태인지 여부 (connect 호출 시 true, disconnect/인증 실패 시 false)
  let shouldStayConnected = false
  let mock: WsMock | null = null

  const isMock = import.meta.env.VITE_WS_MOCK === 'true'
  const wsUrl = import.meta.env.VITE_WS_URL

  const getSessionId = () => typeof sessionId === 'function' ? sessionId() : sessionId

  function syncUnreadCount() {
    const employeeId = authStore.currentUser?.employeeId
    if (!employeeId) return

    notificationService
      .syncUnreadCount(employeeId)
      .catch(() => {
        // 알림 개수 동기화 실패는 다음 동기화 때 복구되므로 무시합니다.
      })
  }

  function clearReconnectTimer() {
    if (reconnectTimeout !== null) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
  }

  /** 네트워크 복구·탭 복귀 시 대기 중인 재연결을 즉시 수행하거나 끊긴 연결을 다시 맺습니다. */
  function tryRecover() {
    if (!shouldStayConnected || socket.value) return

    clearReconnectTimer()
    retryCount = 0
    connect()
  }

  function handleOnline() {
    tryRecover()
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      tryRecover()
    }
  }

  function addRecoveryListeners() {
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  function removeRecoveryListeners() {
    window.removeEventListener('online', handleOnline)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  function connect() {
    if (isConnected.value || socket.value || reconnectTimeout !== null) return

    if (!shouldStayConnected) {
      shouldStayConnected = true
      addRecoveryListeners()
    }

    if (isMock) {
      isConnected.value = true
      error.value = null
      if (!mock) {
        void import('@/mocks/wsMock').then(({ createWsMock }) => {
          if (!mock) {
            mock = createWsMock(handleServerMessage)
          }
        })
      }
      return
    }

    const token = authStore.accessToken
    if (!token) {
      error.value = AUTH_EXPIRED_MESSAGE
      return
    }

    const urlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`

    try {
      const ws = new WebSocket(urlWithToken)
      socket.value = ws

      ws.onopen = () => {
        isConnected.value = true
        error.value = null
        retryCount = 0 // 연결 성공 시 재시도 횟수 초기화
        syncUnreadCount()
      }

      ws.onmessage = (event) => {
        let data: unknown
        try {
          data = JSON.parse(event.data)
        } catch {
          // 파싱할 수 없는 메시지는 무시합니다.
          return
        }
        handleServerMessage(data)
      }

      ws.onerror = () => {
        error.value = 'WebSocket connection error'
      }

      ws.onclose = (event) => {
        // disconnect()로 이미 정리된 소켓의 close 이벤트는 무시합니다.
        if (socket.value !== ws) return

        isConnected.value = false
        socket.value = null

        if (AUTH_FAILURE_CODES.includes(event.code)) {
          shouldStayConnected = false
          removeRecoveryListeners()
          error.value = AUTH_EXPIRED_MESSAGE
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
          return
        }

        if (event.code === 1000 || !shouldStayConnected) return

        if (retryCount < MAX_RETRIES) {
          const delay = Math.min(2 ** retryCount, 16) * 1000 + Math.floor(Math.random() * 500)

          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null
            retryCount++
            connect()
          }, delay)
        } else {
          error.value = '연결이 끊어졌습니다. 재연결 시도 횟수를 초과했습니다.'
          chatStore.setError('error-ws', '서버와의 WebSocket 연결이 해제되었습니다. 페이지를 새로고침하거나 나중에 다시 시도해 주세요.')
        }
      }
    } catch {
      socket.value = null
      error.value = 'WebSocket connection initialization failed'
    }
  }

  function disconnect() {
    shouldStayConnected = false
    removeRecoveryListeners()
    clearReconnectTimer()

    if (isMock) {
      mock?.dispose()
      isConnected.value = false
      return
    }

    if (socket.value) {
      const ws = socket.value
      socket.value = null
      isConnected.value = false
      ws.close(1000, 'Normal Closure')
    }
  }

  function sendMessage(content: string) {
    if (!isConnected.value) return

    // Add user message to state
    const userMsgId = `user-${Date.now()}`
    chatStore.addMessage({
      id: userMsgId,
      role: 'user',
      text: content,
    })
    chatStore.setGenerating(true)

    if (isMock) {
      mock?.runChatScenario(content)
      return
    }

    const sessionId = getSessionId()
    if (socket.value && sessionId) {
      const payload = {
        type: 'chat_message',
        session_id: sessionId,
        content: content,
      }
      socket.value.send(JSON.stringify(payload))
    }
  }

  function sendOwnerConfirmation(messageId: string, ownerId: string) {
    if (isMock) {
      const workspaceId = (route.params.workspaceId as string) || 'unknown-workspace'
      mock?.runOwnerAnswer(messageId, workspaceId)
      return
    }

    ownerConfirmationService
      .requestOwnerConfirmation(messageId, ownerId)
      .catch(() => {
        chatStore.setError(`err-oc-${Date.now()}`, '담당자 호출에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      })
  }

  function handleServerMessage(data: unknown) {
    if (!isWsServerMessage(data)) return

    switch (data.type) {
      case 'searching':
        chatStore.setSearching(true)
        break
      case 'token':
        chatStore.appendToken(data.text, data.message_id)
        break
      case 'done':
        chatStore.finalizeMessage({
          messageId: data.message_id,
          citations: data.citations || [],
          needs_owner_confirmation: data.needs_owner_confirmation || false,
        })
        break
      case 'owner_confirmation_suggested':
        chatStore.setOwnerConfirmation({
          messageId: data.message_id,
          suggestedOwnerId: data.suggested_owner_id,
          suggestedOwnerName: data.suggested_owner_name,
        })
        break
      case 'owner_answer_received':
        chatStore.receiveOwnerAnswer({
          originalMessageId: data.original_message_id,
          content: data.content,
          confirmationId: data.confirmation_id,
          ownerName: data.owner_name,
        })
        window.dispatchEvent(
          new CustomEvent('owner-answer', {
            detail: {
              originalMessageId: data.original_message_id,
              content: data.content,
              ownerName: data.owner_name || chatStore.messageOwnerMap[data.original_message_id] || '담당자',
              confirmationId: data.confirmation_id,
            },
          })
        )
        break
      case 'error':
        chatStore.setError(data.message_id || `err-${Date.now()}`, data.message || '오류가 발생했습니다.')
        break
      case 'notification':
        notificationStore.addNotification(data)
        window.dispatchEvent(
          new CustomEvent('notification-received', { detail: data })
        )
        break
    }
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    sendOwnerConfirmation,
  }
}
