import { scheduleApi } from '@/api/scheduleApi'
import type {
  MeetingStatus,
  MeetingSummaryResponse,
  MeetingDetailResponse,
  CreateMeetingRequest,
  CreateMeetingResponse,
  SubmitAvailableTimesRequest,
  SubmitAvailableTimesResponse,
  ConfirmedScheduleResponse,
  ApiErrorResponse,
} from '@/api/scheduleApi'
import axios from 'axios'

// ─── Layer 3: 비즈니스 로직 (Service) ─────────────────────────────────────
// scheduleApi를 조합하여 View가 에러 처리 세부사항을 신경 쓰지 않도록 추상화합니다.

/**
 * 로그인한 사용자가 참여 중인 회의 목록을 조회합니다.
 * @throws Error - View에서 catch하여 사용자에게 표시할 메시지
 */
async function fetchMeetings(status?: MeetingStatus): Promise<MeetingSummaryResponse[]> {
  try {
    return await scheduleApi.fetchMyMeetings(status ? { status } : undefined)
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.')
    }

    throw new Error('회의 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

/**
 * 회의의 확정 시간, 후보 시간, 참석자 목록, 상태 등 상세 정보를 조회합니다.
 * @throws Error - View에서 catch하여 사용자에게 표시할 메시지
 */
async function fetchMeetingDetail(meetingId: string): Promise<MeetingDetailResponse> {
  try {
    return await scheduleApi.fetchMeetingDetail(meetingId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 404) {
        throw new Error('존재하지 않는 회의입니다.')
      }

      if (status === 401) {
        throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.')
      }
    }

    throw new Error('회의 상세 정보를 불러오는데 실패했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

/**
 * 회의 조율 요청 방을 생성합니다.
 * @throws Error - View에서 catch하여 사용자에게 표시할 메시지
 */
async function createMeeting(request: CreateMeetingRequest): Promise<CreateMeetingResponse> {
  try {
    return await scheduleApi.createMeeting(request)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const serverMessage = (error.response?.data as ApiErrorResponse | undefined)?.message

      if (status === 400) {
        throw new Error(serverMessage ?? '입력 정보가 올바르지 않습니다.')
      }

      if (status === 401) {
        throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.')
      }
    }

    throw new Error('회의 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

/**
 * 로그인한 참석자가 자신의 가능한 시간대 목록을 제출합니다.
 * @throws Error - View에서 catch하여 사용자에게 표시할 메시지
 */
async function submitAvailableTimes(
  meetingId: string,
  request: SubmitAvailableTimesRequest,
): Promise<SubmitAvailableTimesResponse> {
  try {
    return await scheduleApi.submitAvailableTimes(meetingId, request)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const serverMessage = (error.response?.data as ApiErrorResponse | undefined)?.message

      if (status === 400) {
        throw new Error(serverMessage ?? '입력한 시간 정보가 올바르지 않습니다.')
      }

      if (status === 404) {
        throw new Error('존재하지 않는 회의입니다.')
      }

      if (status === 401) {
        throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.')
      }
    }

    throw new Error('가능 시간 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

/**
 * 로그인한 사용자가 참여 중인 CONFIRMED 상태 회의의 확정 시간 슬롯을 기간 내에서 조회합니다.
 * @throws Error - View에서 catch하여 사용자에게 표시할 메시지
 */
async function fetchConfirmedSchedules(
  startDate: string,
  endDate: string,
): Promise<ConfirmedScheduleResponse[]> {
  try {
    return await scheduleApi.fetchMyConfirmedSchedules({ startDate, endDate })
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 400) {
        throw new Error('조회 기간이 올바르지 않습니다.')
      }

      if (status === 401) {
        throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.')
      }
    }

    throw new Error('확정 일정을 불러오는데 실패했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

export const scheduleService = {
  fetchMeetings,
  fetchMeetingDetail,
  createMeeting,
  submitAvailableTimes,
  fetchConfirmedSchedules,
}
