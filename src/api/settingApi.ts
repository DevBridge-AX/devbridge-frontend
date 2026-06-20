import axiosClient from './axiosClient'

// ─── Request / Response 타입 정의 (Co-location) ───────────────────────────

export interface UserProfile {
  id: string
  employeeId: string
  name: string
  email: string
  department: string
  position: string
  jobRole: string
}

export interface UpdateProfilePayload {
  name?: string
  department?: string
  position?: string
  jobRole?: string
}

export interface UpdatePasswordPayload {
  currentPassword?: string
  newPassword?: string
}

export interface ApiErrorResponse {
  message?: string
}

// ─── API 객체 (Layer 1: Axios 통신 규격만 정의) ────────────────────────────

export const settingApi = {
  /**
   * 현재 로그인한 사용자의 프로필 정보를 조회합니다.
   */
  fetchProfile(): Promise<UserProfile> {
    return axiosClient
      .get<UserProfile>('/api/settings/profile')
      .then((res) => res.data)
  },

  /**
   * 프로필 정보(이름, 부서, 직급 등)를 부분 수정합니다.
   */
  updateProfile(payload: UpdateProfilePayload): Promise<void> {
    return axiosClient
      .patch<void>('/api/users/me/profile', payload)
      .then(() => undefined)
  },

  /**
   * 비밀번호를 변경합니다.
   * @throws AxiosError (400: 현재 비밀번호 불일치 혹은 입력 유효성 검증 실패 등)
   */
  updatePassword(payload: UpdatePasswordPayload): Promise<void> {
    return axiosClient
      .put<void>('/api/users/me/password', payload)
      .then(() => undefined)
  },

  /**
   * 현재 비밀번호를 검증합니다.
   */
  verifyPassword(password: string): Promise<void> {
    return axiosClient
      .post<void>('/api/users/me/password/verify', { password })
      .then(() => undefined)
  },
}
