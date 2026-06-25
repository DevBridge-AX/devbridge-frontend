import axiosClient from './axiosClient'

// ─── Request / Response 타입 정의 (Co-location) ───────────────────────────

export type MeetingStatus = 'GATHERING' | 'SELECTING' | 'CONFIRMED' | 'CANCELED'

export type ParticipantRole = 'HOST' | 'ATTENDEE'

export type ParticipantStatus = 'PENDING' | 'RESPONDED'

export interface TimeSlot {
  startTime: string
  endTime: string
}

export type MeetingReferenceType = 'DIRECT_FILE' | 'DOC_LINK' | 'EXTERNAL_LINK'

export interface MeetingReferenceRequest {
  referenceType: MeetingReferenceType
  documentId?: string | null
  fileUrl?: string | null
  title: string
}

export interface MeetingReferenceResponse {
  id: string
  referenceType: MeetingReferenceType
  documentId: string | null
  fileUrl: string | null
  title: string
  createdAt: string
}

export interface CreateMeetingRequest {
  title: string
  durationMinutes: number
  participantEmployeeIds: string[]
  purpose?: string | null
  agenda?: string | null
  location?: string | null
  references?: MeetingReferenceRequest[]
}

export interface CreateMeetingResponse {
  meetingId: string
}

export interface UpdateMeetingRequest {
  title: string
  purpose?: string | null
  agenda?: string | null
  location?: string | null
}

export interface SubmitAvailableTimesRequest {
  availableTimes: TimeSlot[]
}

export interface SubmitAvailableTimesResponse {
  meetingId: string
  employeeId: string
  status: ParticipantStatus
  allParticipantsResponded: boolean
}

export interface ConfirmedScheduleResponse {
  meetingId: string
  title: string
  confirmedStartTime: string
  confirmedEndTime: string
}

export interface MeetingSummaryResponse {
  meetingId: string
  title: string
  status: MeetingStatus
  durationMinutes: number
  confirmedStartTime: string | null
  confirmedEndTime: string | null
  hostEmployeeId?: string
}

export interface MeetingParticipant {
  employeeId: string
  name: string | null
  department: string | null
  position: string | null
  role: ParticipantRole
  status: ParticipantStatus
}

export interface MeetingDetailResponse {
  meetingId: string
  title: string
  purpose?: string | null
  agenda?: string | null
  location?: string | null
  durationMinutes: number
  status: MeetingStatus
  confirmedStartTime: string | null
  confirmedEndTime: string | null
  topCandidateTimes: TimeSlot[]
  participants: MeetingParticipant[]
  references: MeetingReferenceResponse[]
}

export interface FetchMyConfirmedSchedulesParams {
  startDate: string
  endDate: string
}

export interface FetchMyMeetingsParams {
  status?: MeetingStatus
}

export interface ApiErrorResponse {
  message?: string
}

// ─── 워크스페이스 멤버 ───────────────────────────────────────────────────
export type { WorkspaceMemberResponse } from './workspaceApi'

// ─── 회의 생성 모달 emit 페이로드 ──────────────────────────────────────────
export interface CreatedMeetingPayload {
  title: string
  durationMinutes: number
  participantEmployeeIds: string[]
  purpose: string
  agenda: string
  location: string
  availableTimes: TimeSlot[]
  references: MeetingReferenceRequest[]
}

// ─── API 객체 (Layer 1: Axios 통신 규격만 정의) ────────────────────────────

export const scheduleApi = {
  /**
   * 회의 조율 요청 방을 생성합니다.
   * X-Workspace-Id 헤더는 axiosClient에서 자동으로 주입됩니다.
   */
  createMeeting(payload: CreateMeetingRequest): Promise<CreateMeetingResponse> {
    return axiosClient
      .post<CreateMeetingResponse>('/api/meetings', payload)
      .then((res) => res.data)
  },

  /**
   * 로그인한 참석자가 자신의 가능한 시간대 목록을 제출합니다.
   */
  submitAvailableTimes(
    meetingId: string,
    payload: SubmitAvailableTimesRequest,
  ): Promise<SubmitAvailableTimesResponse> {
    return axiosClient
      .post<SubmitAvailableTimesResponse>(`/api/meetings/${meetingId}/participants/me/times`, payload)
      .then((res) => res.data)
  },

  /**
   * 로그인한 사용자가 참여 중인 CONFIRMED 상태 회의의 확정 시간 슬롯을 기간 내에서 조회합니다.
   */
  fetchMyConfirmedSchedules(params: FetchMyConfirmedSchedulesParams): Promise<ConfirmedScheduleResponse[]> {
    return axiosClient
      .get<ConfirmedScheduleResponse[]>('/api/meetings/participants/me/schedules', { params })
      .then((res) => res.data)
  },

  /**
   * 로그인한 사용자가 참여 중인 회의 목록을 조회합니다.
   */
  fetchMyMeetings(params?: FetchMyMeetingsParams): Promise<MeetingSummaryResponse[]> {
    return axiosClient
      .get<MeetingSummaryResponse[]>('/api/meetings', { params })
      .then((res) => res.data)
  },

  /**
   * 회의의 확정 시간, 후보 시간, 참석자 목록, 상태 등 상세 정보를 조회합니다.
   */
  fetchMeetingDetail(meetingId: string): Promise<MeetingDetailResponse> {
    return axiosClient
      .get<MeetingDetailResponse>(`/api/meetings/${meetingId}`)
      .then((res) => res.data)
  },

  /**
   * 회의 정보(제목/목적/아젠다/장소)를 수정합니다. 주최자(HOST)만 가능합니다.
   */
  updateMeeting(meetingId: string, payload: UpdateMeetingRequest): Promise<MeetingDetailResponse> {
    return axiosClient
      .patch<MeetingDetailResponse>(`/api/meetings/${meetingId}`, payload)
      .then((res) => res.data)
  },

  /**
   * 회의 상세 화면에서 첨부파일(파일 업로드 또는 링크)을 추가합니다.
   */
  addMeetingReference(
    meetingId: string,
    payload: MeetingReferenceRequest,
  ): Promise<MeetingReferenceResponse> {
    return axiosClient
      .post<MeetingReferenceResponse>(`/api/meetings/${meetingId}/references`, payload)
      .then((res) => res.data)
  },

  /**
   * 회의 상세 화면에서 첨부파일을 삭제합니다.
   */
  deleteMeetingReference(meetingId: string, referenceId: string): Promise<void> {
    return axiosClient
      .delete<void>(`/api/meetings/${meetingId}/references/${referenceId}`)
      .then(() => undefined)
  },
}
