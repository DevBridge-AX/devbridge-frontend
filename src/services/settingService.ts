import { settingApi } from '@/api/settingApi'
import type { UserProfile, UpdateProfilePayload, UpdatePasswordPayload } from '@/api/settingApi'
import { toApiError } from '@/api/apiError'

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
 * 프로필 정보(이름, 부서, 직급 등)를 수정합니다.
 * @throws ApiError - View에서 catch하여 사용자에게 표시할 메시지
 */
async function modifyProfile(payload: UpdateProfilePayload): Promise<void> {
  try {
    await settingApi.updateProfile(payload)
  } catch (error: unknown) {
    throw toApiError(error, '프로필 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.', {
      400: { serverFirst: '입력 정보가 올바르지 않습니다.' },
      401: '인증이 만료되었습니다. 다시 로그인해 주세요.',
    })
  }
}

/**
 * 비밀번호를 변경합니다.
 * @throws ApiError - View에서 catch하여 사용자에게 표시할 메시지
 */
async function changePassword(payload: UpdatePasswordPayload): Promise<void> {
  try {
    await settingApi.updatePassword(payload)
  } catch (error: unknown) {
    throw toApiError(error, '비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.', {
      400: { serverFirst: '현재 비밀번호가 일치하지 않거나 비밀번호 규격이 올바르지 않습니다.' },
      401: '인증이 만료되었습니다. 다시 로그인해 주세요.',
    })
  }
}

/**
 * 현재 비밀번호를 검증합니다.
 * @throws ApiError - View에서 catch하여 사용자에게 표시할 메시지
 */
async function verifyPassword(password: string): Promise<void> {
  try {
    await settingApi.verifyPassword(password)
  } catch (error: unknown) {
    throw toApiError(error, '비밀번호 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.', {
      400: { serverFirst: '현재 비밀번호가 일치하지 않습니다.' },
      401: { serverFirst: '현재 비밀번호가 일치하지 않습니다.' },
    })
  }
}

export const settingService = {
  getProfile,
  modifyProfile,
  changePassword,
  verifyPassword,
}
