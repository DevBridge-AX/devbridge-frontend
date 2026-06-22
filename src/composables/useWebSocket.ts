import { ref, onUnmounted } from 'vue'
import { useAuthStore } from '@/state/authStore'
import { useChatStore } from '@/state/chatStore'
import { useNotificationStore } from '@/state/notificationStore'

export function useWebSocket(sessionId: string | (() => string)) {
  const authStore = useAuthStore()
  const chatStore = useChatStore()
  const notificationStore = useNotificationStore()
  const socket = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  
  let retryCount = 0
  const maxRetries = 3
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let mockTimerIds: ReturnType<typeof setTimeout>[] = []

  const isMock = import.meta.env.VITE_WS_MOCK === 'true'
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/chat'

  const getSessionId = () => typeof sessionId === 'function' ? sessionId() : sessionId

  function connect() {
    if (isConnected.value || socket.value) return

    if (isMock) {
      console.log('[Mock WS] Connecting to mock WebSocket...')
      isConnected.value = true
      error.value = null
      return
    }

    const token = authStore.accessToken
    if (!token) {
      error.value = '인증이 만료되었습니다. 다시 로그인해주세요.'
      return
    }

    const urlWithToken = `${wsUrl}?token=${encodeURIComponent(token)}`

    try {
      socket.value = new WebSocket(urlWithToken)

      socket.value.onopen = () => {
        console.log('[WS] Connection established.')
        isConnected.value = true
        error.value = null
        retryCount = 0 // Reset retry count on successful connection
      }

      socket.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleServerMessage(data)
        } catch (err) {
          console.error('[WS] Failed to parse message:', err)
        }
      }

      socket.value.onerror = (err) => {
        console.error('[WS] Error:', err)
        error.value = 'WebSocket connection error'
      }

      socket.value.onclose = (event) => {
        isConnected.value = false
        socket.value = null

        if (event.code === 1002 || event.code === 1008 || event.code === 4401) {
          error.value = '인증이 만료되었습니다. 다시 로그인해주세요.'
          chatStore.setError('error-ws-auth', '인증이 만료되었습니다. 다시 로그인해주세요.')
          return
        }

        if (event.code !== 1000 && retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000
          console.log(`[WS] Attempting reconnect in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`)
          
          reconnectTimeout = setTimeout(() => {
            retryCount++
            connect()
          }, delay)
        } else if (retryCount >= maxRetries) {
          error.value = '연결이 끊어졌습니다. 재연결 시도 횟수를 초과했습니다.'
          chatStore.setError('error-ws', '서버와의 WebSocket 연결이 해제되었습니다. 페이지를 새로고침하거나 나중에 다시 시도해 주세요.')
        }
      }
    } catch (err) {
      console.error('[WS] Exception during connection:', err)
      error.value = 'WebSocket connection initialization failed'
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    mockTimerIds.forEach(clearTimeout)
    mockTimerIds = []

    if (isMock) {
      console.log('[Mock WS] Disconnected.')
      isConnected.value = false
      return
    }

    if (socket.value) {
      socket.value.close(1000, 'Normal Closure')
      socket.value = null
      isConnected.value = false
    }
  }

  function sendMessage(content: string) {
    if (!isConnected.value) {
      console.warn('[WS] Cannot send message, not connected.')
      return
    }

    // Add user message to state
    const userMsgId = `user-${Date.now()}`
    chatStore.addMessage({
      id: userMsgId,
      role: 'user',
      text: content,
    })
    chatStore.setGenerating(true)

    if (isMock) {
      runMockScenario(content)
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

  // 담당자 호출 (UC-04 담당자 호출 REST API or WebSocket)
  function sendOwnerConfirmation(messageId: string, ownerId: string) {
    if (isMock) {
      console.log(`[Mock WS] Sending owner confirmation request for message: ${messageId}`)
      // Simulate answer after 2.5 seconds
      const timer = setTimeout(() => {
        handleServerMessage({
          type: 'owner_answer_received',
          original_message_id: messageId,
          content: '네, 김개발입니다. 해당 매입 처리 규격 API의 경우 기존 레거시 시스템과의 동기화 문제로 인해 매 정각 배치 작업으로 처리되고 있습니다. 자세한 배치 스케줄은 내부 배치 시스템 문서를 참조해 주세요.',
        })
      }, 2500)
      mockTimerIds.push(timer)
      return
    }

    // TODO: Spring UC-04 담당자 호출 엔드포인트 연동 시, WebSocket 메시지 또는 REST API 호출로 변경
    if (socket.value) {
      socket.value.send(JSON.stringify({
        type: 'owner_confirmation_request',
        session_id: getSessionId(),
        message_id: messageId,
        owner_id: ownerId,
      }))
    }
  }

  function handleServerMessage(data: any) {
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
        })
        // Dispatch custom DOM event for toast overlay to pick up
        window.dispatchEvent(
          new CustomEvent('owner-answer', {
            detail: {
              originalMessageId: data.original_message_id,
              content: data.content,
              ownerName: chatStore.messageOwnerMap[data.original_message_id] || '김개발',
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
      default:
        console.warn('[WS] Unknown message type:', data.type)
    }
  }

  function runMockScenario(content: string) {
    mockTimerIds.forEach(clearTimeout)
    mockTimerIds = []

    const isOwnerScenario = content.includes('담당자') || content.toLowerCase().includes('owner') || content.toLowerCase().includes('help')

    if (isOwnerScenario) {
      const messageId = `mock-owner-${Date.now()}`
      // Scenarios for owner suggestion
      const scenario = [
        { delay: 300, data: { type: 'searching' } },
        { delay: 1000, data: { type: 'token', message_id: messageId, text: '해당 결제 모듈의 상세 매입 처리 규격에 대한 근거가 문서에 부족합니다. ' } },
        { delay: 1800, data: { type: 'token', message_id: messageId, text: '따라서 정확한 안내를 위해 담당자 확인이 필요할 수 있습니다.' } },
        {
          delay: 2400,
          data: {
            type: 'owner_confirmation_suggested',
            message_id: messageId,
            suggested_owner_id: 'owner-uuid-99',
            suggested_owner_name: '김개발',
          },
        },
        {
          delay: 3000,
          data: {
            type: 'done',
            message_id: messageId,
            citations: [],
            needs_owner_confirmation: true,
          },
        },
      ]

      scenario.forEach((step) => {
        const timer = setTimeout(() => {
          handleServerMessage(step.data)
        }, step.delay)
        mockTimerIds.push(timer)
      })
    } else {
      const messageId = `mock-normal-${Date.now()}`
      // Normal scenario
      const scenario = [
        { delay: 300, data: { type: 'searching' } },
        { delay: 1200, data: { type: 'token', message_id: messageId, text: '결제 모듈은 ' } },
        { delay: 1800, data: { type: 'token', message_id: messageId, text: '세 가지 단계로 구성됩니다. ' } },
        { delay: 2400, data: { type: 'token', message_id: messageId, text: '1단계는 인증(Auth), 2단계는 승인(Approve), 3단계는 매입(Capture) 처리입니다. ' } },
        { delay: 2900, data: { type: 'token', message_id: messageId, text: '각 단계별 세부 API 호출은 결제 API 가이드 문서를 참조하세요.' } },
        {
          delay: 3500,
          data: {
            type: 'done',
            message_id: messageId,
            citations: [
              { source_type: 'document', source_id: 1, title: '결제 API 문서', similarity_score: 0.82 },
              { source_type: 'git_commit', source_id: 5, title: 'feat: 결제 모듈 리팩토링', similarity_score: 0.71 },
              { source_type: 'db_schema', source_id: 12, title: 'payment_transaction_table_schema', similarity_score: 0.64 },
            ],
            needs_owner_confirmation: false,
          },
        },
      ]

      scenario.forEach((step) => {
        const timer = setTimeout(() => {
          handleServerMessage(step.data)
        }, step.delay)
        mockTimerIds.push(timer)
      })
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
