import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/state/authStore'

// ─── Layer 3: 비즈니스 로직 (Service) ─────────────────────────────────────
// authApi를 조합하여 View가 복잡한 흐름을 신경 쓰지 않도록 추상화합니다.

export interface LoginResult {
  success: boolean
  lastWorkspaceId: string | null
}

/**
 * [Step 1] HR 직원 검증
 * 사원번호와 이름으로 HR 시스템에 등록된 직원인지 확인합니다.
 * @returns 검증 성공 여부 (true/false)
 */
async function verifyEmployee(
  employeeId: string,
  name: string,
): Promise<boolean> {
  try {
    const result = await authApi.verifyHr({ employeeId, name })
    return !!result
  } catch {
    return false
  }
}

/**
 * [Step 2] 이메일 인증 코드 발송
 * HR 검증된 사번과 이메일을 함께 전달하여 매칭 여부를 서버에서 검증합니다.
 */
async function sendAuthEmail(employeeId: string, email: string): Promise<void> {
  await authApi.sendEmailAuthCode({ employeeId, email })
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
 * 로그인 처리: API 호출 후 authStore를 통해 토큰을 저장합니다.
 * @returns 로그인 성공 여부 (true / false)
 */

async function executeLogin(
  employeeId: string,
  password: string,
): Promise<LoginResult> {
  try {
    const response = await authApi.signin({ employeeId, password })

    const authStore = useAuthStore()
    authStore.setToken(response.accessToken)
    await fetchCurrentUser()

    return {
      success: true,
      lastWorkspaceId: response.lastWorkspaceId,
    }
  } catch {
    return {
      success: false,
      lastWorkspaceId: null,
    }
  }
}

/**
 * 로그인한 본인 정보를 조회하여 authStore에 저장합니다.
 * Host 판별 등 본인 식별이 필요한 화면에서 사용합니다.
 */
async function fetchCurrentUser(): Promise<void> {
  try {
    const user = await authApi.fetchCurrentUser()
    const authStore = useAuthStore()
    authStore.setCurrentUser(user)
  } catch {
    // 본인 정보 조회 실패 시 currentUser는 null로 유지되며,
    // Host 판별이 필요한 화면에서는 "Host 아님"으로 안전하게 처리됨
  }
}

/**
 * 로그아웃: 서버 세션 무효화 후 authStore를 통해 토큰을 제거합니다.
 */
async function executeLogout(): Promise<void> {
  try {
    await authApi.logout()
  } finally {
    const authStore = useAuthStore()
    authStore.logout()
  }
}

export const authService = {
  verifyEmployee,
  sendAuthEmail,
  verifyAuthEmail,
  registerUser,
  executeLogin,
  executeLogout,
  fetchCurrentUser,
}
