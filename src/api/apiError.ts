import axios from 'axios'

/** 세션 만료(401) 시 axiosClient가 발행하고 main.ts가 구독하는 window 이벤트명 */
export const SESSION_EXPIRED_EVENT = 'auth:session-expired'

const NETWORK_ERROR_MESSAGE =
  '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.'
const SERVER_ERROR_MESSAGE =
  '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'

/** 상태 코드별 기본 안내 문구 (5xx는 SERVER_ERROR_MESSAGE 사용) */
export const DEFAULT_STATUS_MESSAGE: Readonly<Record<number, string>> = {
  400: '잘못된 요청입니다.',
  401: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  403: '접근 권한이 없습니다.',
  404: '요청한 정보를 찾을 수 없습니다.',
  409: '요청을 처리할 수 없는 상태입니다.',
  413: '파일 용량이 너무 큽니다.',
}

/**
 * API 호출 실패를 표현하는 공통 에러입니다.
 * status 0은 네트워크 오류 또는 원인을 알 수 없는 오류를 의미합니다.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(
    status: number,
    code: string | null,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

interface ErrorBody {
  code: string | null
  message: string | null
}

/** 백엔드 에러 응답 body({ status, code, message })에서 code/message를 안전하게 추출합니다. */
function readErrorBody(data: unknown): ErrorBody {
  if (typeof data !== 'object' || data === null) {
    return { code: null, message: null }
  }

  const record = data as Record<string, unknown>
  const code = typeof record.code === 'string' ? record.code : null
  const message =
    typeof record.message === 'string' && record.message.trim() !== ''
      ? record.message
      : null

  return { code, message }
}

/**
 * 상태 코드별 메시지 지정 방식
 * - string: 항상 해당 문구 사용 (FE 우선)
 * - { serverFirst }: 백엔드 message가 있으면 그것을, 없으면 해당 문구 사용
 */
export type StatusMessage = string | { serverFirst: string }

function resolveOverride(
  override: StatusMessage,
  serverMessage: string | null,
): string {
  if (typeof override === 'string') {
    return override
  }
  return serverMessage ?? override.serverFirst
}

function getDefaultMessage(status: number): string | undefined {
  if (status >= 500 && status <= 599) {
    return SERVER_ERROR_MESSAGE
  }
  return DEFAULT_STATUS_MESSAGE[status]
}

/**
 * unknown 에러를 ApiError로 변환합니다.
 * 메시지 우선순위: overrides[status] > 백엔드 message > fallbackMessage
 * (상태 코드 기본 문구는 fallbackMessage가 빈 문자열일 때만 사용)
 */
export function toApiError(
  error: unknown,
  fallbackMessage: string,
  overrides?: Partial<Record<number, StatusMessage>>,
): ApiError {
  if (isApiError(error)) {
    const override = overrides?.[error.status]
    if (override === undefined) {
      return error
    }
    if (typeof override !== 'string' && error.message.trim() !== '') {
      return error
    }
    return new ApiError(
      error.status,
      error.code,
      resolveOverride(override, null),
      { cause: error },
    )
  }

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status
      const body = readErrorBody(error.response.data)
      const override = overrides?.[status]
      const message =
        (override !== undefined
          ? resolveOverride(override, body.message)
          : undefined) ??
        body.message ??
        (fallbackMessage !== ''
          ? fallbackMessage
          : (getDefaultMessage(status) ?? fallbackMessage))

      return new ApiError(status, body.code, message, { cause: error })
    }

    const networkOverride = overrides?.[0]
    return new ApiError(
      0,
      null,
      networkOverride !== undefined
        ? resolveOverride(networkOverride, null)
        : NETWORK_ERROR_MESSAGE,
      { cause: error },
    )
  }

  return new ApiError(0, null, fallbackMessage, { cause: error })
}
