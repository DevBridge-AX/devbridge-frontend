import { ownerConfirmationApi } from '@/api/ownerConfirmationApi'
import type { OwnerConfirmationResponse } from '@/api/ownerConfirmationApi'
import { toApiError } from '@/api/apiError'

// ─── Layer 3: 비즈니스 로직 (Service) ─────────────────────────────────────
// ownerConfirmationApi를 조합하여 View가 에러 처리 세부사항을 신경 쓰지 않도록 추상화합니다.

async function fetchConfirmation(confirmationId: string): Promise<OwnerConfirmationResponse> {
  try {
    return await ownerConfirmationApi.getConfirmation(confirmationId)
  } catch (error: unknown) {
    throw toApiError(error, '확인 요청 정보를 불러오는데 실패했습니다.', {
      404: '존재하지 않는 확인 요청입니다.',
      401: '인증이 만료되었습니다. 다시 로그인해 주세요.',
    })
  }
}

async function submitAnswer(
  confirmationId: string,
  answerContent: string,
): Promise<OwnerConfirmationResponse> {
  try {
    return await ownerConfirmationApi.submitAnswer(confirmationId, { answerContent })
  } catch (error: unknown) {
    throw toApiError(error, '답변 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.', {
      403: { serverFirst: '배정된 담당자만 답변할 수 있습니다.' },
      409: { serverFirst: '이미 답변이 완료된 요청입니다.' },
      401: '인증이 만료되었습니다. 다시 로그인해 주세요.',
    })
  }
}

export const ownerConfirmationService = {
  fetchConfirmation,
  submitAnswer,
}
