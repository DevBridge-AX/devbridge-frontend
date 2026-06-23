import axiosClient from './axiosClient'

// ─── Request / Response 타입 정의 (Co-location) ───────────────────────────

export type OwnerConfirmationStatus = 'PENDING' | 'ANSWERED'

export interface OwnerConfirmationResponse {
  id: string
  workspaceId: string
  questionContent: string
  assignedOwnerEmployeeId: string
  assignedOwnerName: string
  requesterEmployeeId: string
  requesterName: string
  status: OwnerConfirmationStatus
  answerContent: string | null
  answeredAt: string | null
  createdAt: string
  questionMessageId: string | null
  relatedDocumentId: string | null
  relatedDocumentTitle: string | null
}

export interface OwnerConfirmationPageResponse {
  content: OwnerConfirmationResponse[]
  totalElements: number
  number: number
  size: number
}

export interface OwnerConfirmationListParams {
  page?: number
  size?: number
}

export interface SubmitAnswerRequest {
  answerContent: string
}

// ─── API 객체 (Layer 1: Axios 통신 규격만 정의) ────────────────────────────

export const ownerConfirmationApi = {
  getConfirmation(confirmationId: string): Promise<OwnerConfirmationResponse> {
    return axiosClient
      .get<OwnerConfirmationResponse>(
        `/api/owner-confirmations/${encodeURIComponent(confirmationId)}`,
      )
      .then((res) => res.data)
  },

  submitAnswer(
    confirmationId: string,
    payload: SubmitAnswerRequest,
  ): Promise<OwnerConfirmationResponse> {
    return axiosClient
      .post<OwnerConfirmationResponse>(
        `/api/owner-confirmations/${encodeURIComponent(confirmationId)}/answer`,
        payload,
      )
      .then((res) => res.data)
  },

  getRequestedList(params: OwnerConfirmationListParams): Promise<OwnerConfirmationPageResponse> {
    return axiosClient
      .get<OwnerConfirmationPageResponse>('/api/owner-confirmations/requested', { params })
      .then((res) => res.data)
  },

  getAssignedList(params: OwnerConfirmationListParams): Promise<OwnerConfirmationPageResponse> {
    return axiosClient
      .get<OwnerConfirmationPageResponse>('/api/owner-confirmations/assigned', { params })
      .then((res) => res.data)
  },
}
