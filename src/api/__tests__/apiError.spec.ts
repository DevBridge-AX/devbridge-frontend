import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ApiError, isApiError, toApiError } from '@/api/apiError'

const FALLBACK = '기본 실패 메시지'

function makeAxiosError(status: number, data: unknown = undefined): AxiosError {
  const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() }
  const response: AxiosResponse = {
    data,
    status,
    statusText: '',
    headers: {},
    config,
  }
  return new AxiosError('request failed', 'ERR_BAD_REQUEST', config, null, response)
}

describe('toApiError', () => {
  it('403 응답은 백엔드 code/message를 유지한다', () => {
    const error = makeAxiosError(403, {
      status: 403,
      code: 'FORBIDDEN_DOC',
      message: '문서 접근 권한이 없습니다.',
    })

    const result = toApiError(error, FALLBACK)

    expect(isApiError(result)).toBe(true)
    expect(result.status).toBe(403)
    expect(result.code).toBe('FORBIDDEN_DOC')
    expect(result.message).toBe('문서 접근 권한이 없습니다.')
  })

  it('500 응답에 message가 없으면 fallbackMessage를 사용한다', () => {
    const result = toApiError(makeAxiosError(500, {}), FALLBACK)

    expect(result.status).toBe(500)
    expect(result.message).toBe(FALLBACK)
  })

  it('fallbackMessage가 빈 문자열이면 500 응답에 5xx 기본 문구를 사용한다', () => {
    const result = toApiError(makeAxiosError(500), '')

    expect(result.message).toBe(
      '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    )
  })

  it('응답이 없는 네트워크 오류는 status 0과 네트워크 문구를 반환한다', () => {
    const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() }
    const error = new AxiosError('Network Error', 'ERR_NETWORK', config, {})

    const result = toApiError(error, FALLBACK)

    expect(result.status).toBe(0)
    expect(result.code).toBeNull()
    expect(result.message).toBe(
      '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.',
    )
  })

  it('overrides가 백엔드 message보다 우선한다', () => {
    const error = makeAxiosError(404, {
      status: 404,
      code: 'NOT_FOUND',
      message: '백엔드 메시지',
    })

    const result = toApiError(error, FALLBACK, { 404: '문서를 찾을 수 없습니다.' })

    expect(result.message).toBe('문서를 찾을 수 없습니다.')
    expect(result.code).toBe('NOT_FOUND')
  })

  it('serverFirst override는 백엔드 message가 있으면 그것을 사용한다', () => {
    const error = makeAxiosError(400, {
      status: 400,
      code: 'INVALID',
      message: '백엔드 검증 메시지',
    })

    const result = toApiError(error, FALLBACK, {
      400: { serverFirst: '입력 정보가 올바르지 않습니다.' },
    })

    expect(result.message).toBe('백엔드 검증 메시지')
  })

  it('serverFirst override는 백엔드 message가 없으면 지정 문구를 사용한다', () => {
    const result = toApiError(makeAxiosError(400, {}), FALLBACK, {
      400: { serverFirst: '입력 정보가 올바르지 않습니다.' },
    })

    expect(result.message).toBe('입력 정보가 올바르지 않습니다.')
  })

  it('axios 에러가 아니면 fallbackMessage와 status 0을 사용한다', () => {
    const cause = new Error('boom')

    const result = toApiError(cause, FALLBACK)

    expect(result.status).toBe(0)
    expect(result.code).toBeNull()
    expect(result.message).toBe(FALLBACK)
    expect(result.cause).toBe(cause)
  })

  it('413 응답에 body가 없으면 fallbackMessage를 사용하고, override가 있으면 override를 사용한다', () => {
    const noOverride = toApiError(makeAxiosError(413), FALLBACK)

    expect(noOverride.status).toBe(413)
    expect(noOverride.message).toBe(FALLBACK)

    const overridden = toApiError(makeAxiosError(413), FALLBACK, {
      413: '파일 용량이 너무 큽니다.',
    })

    expect(overridden.message).toBe('파일 용량이 너무 큽니다.')
  })

  it('이미 ApiError이면 그대로 반환하고, 일치하는 override가 있으면 메시지를 교체한다', () => {
    const original = new ApiError(409, 'CONFLICT', '충돌')

    expect(toApiError(original, FALLBACK)).toBe(original)
    expect(toApiError(original, FALLBACK, { 404: '다른 상태' })).toBe(original)

    const overridden = toApiError(original, FALLBACK, { 409: '이미 존재합니다.' })

    expect(overridden).not.toBe(original)
    expect(overridden.status).toBe(409)
    expect(overridden.code).toBe('CONFLICT')
    expect(overridden.message).toBe('이미 존재합니다.')
  })

  it('기본 문구도 백엔드 message도 없는 상태 코드는 fallbackMessage를 사용한다', () => {
    const result = toApiError(makeAxiosError(418), FALLBACK)

    expect(result.status).toBe(418)
    expect(result.message).toBe(FALLBACK)
  })
})
