import { authApi } from '@/api/authApi'
import type { SigninResponse } from '@/api/authApi'

// ─── Layer 3: 비즈니스 로직 (Service) ─────────────────────────────────────
// authApi를 조합하여 View가 복잡한 흐름을 신경 쓰지 않도록 추상화합니다.

/**
 * [Step 1] HR 직원 검증
 * 사원번호와 이름으로 HR 시스템에 등록된 직원인지 확인합니다.
 * @returns 검증 성공 여부 (true/false)
 */
async function verifyEmployee(employeeId: string, name: string): Promise<boolean> {
  try {
    const result = await authApi.verifyHr({ employeeId, name })
    return !!result
  } catch {
    return false
  }
}

/**
 * [Step 2] 이메일 인증 코드 발송
 * 입력된 이메일로 인증 코드를 발송합니다.
 */
async function sendAuthEmail(email: string): Promise<void> {
  await authApi.sendEmailAuthCode({ email })
}

/**
 * [Step 3] 이메일 인증 코드 검증
 * 사용자가 입력한 코드가 올바른지 확인합니다.
 */
async function verifyAuthEmail(email: string, code: string): Promise<void> {
  await authApi.verifyEmailAuthCode({ email, code })
}

/**
 * [Step 4] 최종 회원가입
 * HR 검증 및 이메일 인증이 완료된 후 계정을 생성합니다.
 */
async function registerUser(
  employeeId: string,
  email: string,
  password: string,
): Promise<void> {
  await authApi.signup({ employeeId, email, password })
}

/**
 * 로그인 처리 및 accessToken을 localStorage에 저장합니다.
 * @returns 로그인 응답 (accessToken, tokenType)
 */
async function login(employeeId: string, password: string): Promise<SigninResponse> {
  const response = await authApi.signin({ employeeId, password })
  localStorage.setItem('accessToken', response.accessToken)
  return response
}

/**
 * 로그아웃 처리 및 localStorage의 accessToken을 제거합니다.
 */
async function logout(): Promise<void> {
  await authApi.logout()
  localStorage.removeItem('accessToken')
}

export const authService = {
  verifyEmployee,
  sendAuthEmail,
  verifyAuthEmail,
  registerUser,
  login,
  logout,
}
