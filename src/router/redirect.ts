/**
 * 로그인 후 이동할 redirect 값을 검증합니다.
 * 내부 경로만 허용하며, 외부 URL과 로그인/회원가입 경로는 null을 반환합니다.
 */
export function toSafeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') return null
  // 프로토콜 상대 URL, 외부 URL 차단
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  // 로그인/회원가입 경로는 루프 방지를 위해 제외
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/signup')) return null
  return value
}
