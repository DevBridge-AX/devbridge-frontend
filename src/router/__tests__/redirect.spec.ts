import { describe, expect, it } from 'vitest'
import { toSafeRedirect } from '@/router/redirect'

describe('toSafeRedirect', () => {
  it('내부 경로는 그대로 반환한다', () => {
    expect(toSafeRedirect('/workspaces/1/tasks')).toBe('/workspaces/1/tasks')
  })

  it('외부/프로토콜 상대 URL은 null을 반환한다', () => {
    expect(toSafeRedirect('https://evil.com')).toBeNull()
    expect(toSafeRedirect('//evil.com')).toBeNull()
    expect(toSafeRedirect('/\\evil.com')).toBeNull()
  })

  it('문자열이 아니면 null을 반환한다', () => {
    expect(toSafeRedirect(undefined)).toBeNull()
    expect(toSafeRedirect(['/workspace'])).toBeNull()
  })

  it('로그인/회원가입 경로는 null을 반환한다', () => {
    expect(toSafeRedirect('/login')).toBeNull()
    expect(toSafeRedirect('/login?redirect=/workspace')).toBeNull()
    expect(toSafeRedirect('/signup')).toBeNull()
  })
})
