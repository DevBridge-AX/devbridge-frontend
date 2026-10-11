import type { WsServerMessage } from '@/types/ws'

// ─── WebSocket Mock 시나리오 ────────────────────────────────────────────
// VITE_WS_MOCK=true 일 때만 동적 import 되어 별도 청크로 분리됩니다.

export interface WsMock {
  runChatScenario(content: string): void
  runOwnerAnswer(messageId: string, workspaceId: string): void
  dispose(): void
}

interface MockStep {
  delay: number
  data: WsServerMessage
}

export function createWsMock(emit: (message: WsServerMessage) => void): WsMock {
  let timerIds: ReturnType<typeof setTimeout>[] = []

  function clearTimers() {
    timerIds.forEach(clearTimeout)
    timerIds = []
  }

  function schedule(scenario: MockStep[]) {
    scenario.forEach((step) => {
      const timer = setTimeout(() => {
        emit(step.data)
      }, step.delay)
      timerIds.push(timer)
    })
  }

  function runChatScenario(content: string) {
    clearTimers()

    const isOwnerScenario = content.includes('담당자') || content.toLowerCase().includes('owner') || content.toLowerCase().includes('help')

    if (isOwnerScenario) {
      const messageId = `mock-owner-${Date.now()}`
      // Scenarios for owner suggestion
      const scenario: MockStep[] = [
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
      schedule(scenario)
    } else {
      const messageId = `mock-normal-${Date.now()}`
      // Normal scenario
      const scenario: MockStep[] = [
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
      schedule(scenario)
    }
  }

  function runOwnerAnswer(messageId: string, workspaceId: string) {
    const timer = setTimeout(() => {
      emit({
        type: 'owner_answer_received',
        original_message_id: messageId,
        confirmation_id: `mock-oc-${Date.now()}`,
        content: '네, 김개발입니다. 해당 매입 처리 규격 API의 경우 기존 레거시 시스템과의 동기화 문제로 인해 매 정각 배치 작업으로 처리되고 있습니다. 자세한 배치 스케줄은 내부 배치 시스템 문서를 참조해 주세요.',
        owner_name: '김개발',
        workspace_id: workspaceId,
      })
    }, 2500)
    timerIds.push(timer)
  }

  function dispose() {
    clearTimers()
  }

  return { runChatScenario, runOwnerAnswer, dispose }
}
