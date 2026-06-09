import { settingApi } from '@/api/settingApi'
import type { UserProfile, UpdateProfilePayload, ApiErrorResponse } from '@/api/settingApi'
import axios from 'axios'

// ─── Layer 3: 비즈니스 로직 (Service) ─────────────────────────────────────
// settingApi를 조합하여 View가 에러 처리 세부사항을 신경 쓰지 않도록 추상화합니다.

/**
 * 현재 로그인한 사용자의 프로필 정보를 반환합니다.
 * @throws Error - API 통신 실패 시
 */
async function getProfile(): Promise<UserProfile> {
  return await settingApi.fetchProfile()
}

/**
 * 프로필(이름 / 비밀번호)을 수정합니다.
 * - 400 응답: 서버 메시지를 파싱해 명확한 한국어 에러를 throw합니다.
 * - 그 외 오류: 일반 에러 메시지를 throw합니다.
 * @throws Error - View에서 catch하여 사용자에게 표시할 메시지
 */
async function modifyProfile(payload: UpdateProfilePayload): Promise<void> {
  try {
    await settingApi.updateProfile(payload)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const serverMessage = (error.response?.data as ApiErrorResponse | undefined)?.message

      if (status === 400) {
        // 현재 비밀번호 불일치 등 비즈니스 검증 오류
        throw new Error(serverMessage ?? '현재 비밀번호가 올바르지 않습니다.')
      }

      if (status === 401) {
        throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.')
      }
    }

    // 네트워크 오류 또는 기타 예외
    throw new Error('프로필 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

export const settingService = {
  getProfile,
  modifyProfile,
}
