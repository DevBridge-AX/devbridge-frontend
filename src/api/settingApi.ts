import axiosClient from './axiosClient'

// ─── Request / Response 타입 정의 (Co-location) ───────────────────────────

export interface UserProfile {
  employeeId: string
  name: string
  email: string
  department: string
  position: string
}

export interface UpdateProfilePayload {
  name?: string
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
   * 프로필 정보(이름 / 비밀번호)를 수정합니다.
   * @throws AxiosError (400: 현재 비밀번호 불일치 등)
   */
  updateProfile(payload: UpdateProfilePayload): Promise<void> {
    return axiosClient
      .patch<void>('/api/settings/profile', payload)
      .then(() => undefined)
  },
}
