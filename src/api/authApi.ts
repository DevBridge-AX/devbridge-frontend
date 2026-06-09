import axiosClient from './axiosClient'

// ─── Request / Response 타입 정의 (Co-location) ───────────────────────────

export interface VerifyHrRequest {
  employeeId: string
  name: string
}

export interface SignupRequest {
  employeeId: string
  email: string
  password: string
}

export interface SigninRequest {
  employeeId: string
  password: string
}

export interface SigninResponse {
  accessToken: string
  tokenType: string
}

export interface SendEmailAuthCodeRequest {
  employeeId: string
  email: string
}

export interface VerifyEmailAuthCodeRequest {
  email: string
  code: string
}

// ─── API 객체 (Layer 1: Axios 통신 규격만 정의) ────────────────────────────

export const authApi = {
  /**
   * HR 직원 존재 여부를 검증합니다.
   * @returns 검증 토큰 문자열
   */
  verifyHr(payload: VerifyHrRequest): Promise<string> {
    return axiosClient
      .post<string>('/api/auth/verify-hr', payload)
      .then((res) => res.data)
  },

  /**
   * 신규 회원가입을 처리합니다.
   */
  signup(payload: SignupRequest): Promise<void> {
    return axiosClient
      .post<void>('/api/auth/signup', payload)
      .then(() => undefined)
  },

  /**
   * 로그인 후 accessToken을 반환합니다.
   */
  signin(payload: SigninRequest): Promise<SigninResponse> {
    return axiosClient
      .post<SigninResponse>('/api/auth/signin', payload)
      .then((res) => res.data)
  },

  /**
   * 로그아웃 처리합니다. (서버 세션 무효화)
   */
  logout(): Promise<void> {
    return axiosClient
      .post<void>('/api/auth/logout')
      .then(() => undefined)
  },

  /**
   * 이메일 인증 코드를 발송합니다.
   */
  sendEmailAuthCode(payload: SendEmailAuthCodeRequest): Promise<void> {
    return axiosClient
      .post<void>('/api/auth/email/send', payload)
      .then(() => undefined)
  },

  /**
   * 발송된 이메일 인증 코드를 검증합니다.
   */
  verifyEmailAuthCode(payload: VerifyEmailAuthCodeRequest): Promise<void> {
    return axiosClient
      .post<void>('/api/auth/email/verify', payload)
      .then(() => undefined)
  },
}
