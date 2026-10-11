import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import type { App } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { SESSION_EXPIRED_EVENT } from '@/api/apiError'
import { useAuthStore } from '@/state/authStore'
import { useChatStore } from '@/state/chatStore'
import { useWebSocket } from '@/composables/useWebSocket'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {} }),
}))

vi.mock('@/services/notificationService', () => ({
  notificationService: {
    syncUnreadCount: vi.fn(() => Promise.resolve()),
  },
}))

class FakeWebSocket {
  static instances: FakeWebSocket[] = []

  onopen: (() => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  close = vi.fn()
  send = vi.fn()

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }

  triggerOpen() {
    this.onopen?.()
  }

  triggerClose(code: number) {
    this.onclose?.({ code })
  }
}

type WebSocketApi = ReturnType<typeof useWebSocket>

/** 컴포넌트 setup 안에서 composable을 호출해 onUnmounted 경고를 피합니다. */
function withSetup(): { api: WebSocketApi; app: App } {
  let api: WebSocketApi | null = null
  const app = createApp(
    defineComponent({
      setup() {
        api = useWebSocket('session-1')
        return () => h('div')
      },
    }),
  )
  app.mount(document.createElement('div'))
  if (!api) throw new Error('useWebSocket setup failed')
  return { api, app }
}

/** 마지막으로 생성된 소켓을 반환합니다. */
function lastSocket(): FakeWebSocket {
  const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
  if (!ws) throw new Error('no WebSocket instance')
  return ws
}

describe('useWebSocket 재연결', () => {
  let app: App
  let api: WebSocketApi

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.stubEnv('VITE_WS_URL', 'ws://localhost:test/ws')
    vi.stubEnv('VITE_WS_MOCK', 'false')
    vi.stubGlobal('WebSocket', FakeWebSocket)
    FakeWebSocket.instances = []
    setActivePinia(createPinia())
    useAuthStore().setToken('test-token')
    ;({ api, app } = withSetup())
  })

  afterEach(() => {
    app.unmount()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('비정상 종료(1006) 시 1초 후 새 WebSocket을 생성한다', () => {
    api.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)

    lastSocket().triggerClose(1006)
    vi.advanceTimersByTime(999)
    expect(FakeWebSocket.instances).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('인증 실패(4401)는 재연결하지 않고 세션 만료 이벤트를 발행한다', () => {
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)

    api.connect()
    lastSocket().triggerClose(4401)
    vi.advanceTimersByTime(60_000)

    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(api.error.value).toBe('인증이 만료되었습니다. 다시 로그인해주세요.')
  })

  it('재연결 5회 실패 후에는 error-ws를 설정하고 더 이상 연결하지 않는다', () => {
    const setError = vi.spyOn(useChatStore(), 'setError')

    api.connect()
    for (let attempt = 0; attempt < 5; attempt++) {
      lastSocket().triggerClose(1006)
      vi.advanceTimersByTime(60_000)
    }
    expect(FakeWebSocket.instances).toHaveLength(6)
    expect(setError).not.toHaveBeenCalled()

    lastSocket().triggerClose(1006)
    vi.advanceTimersByTime(60_000)

    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError.mock.calls[0]?.[0]).toBe('error-ws')
    expect(FakeWebSocket.instances).toHaveLength(6)
  })

  it('connect()를 중복 호출하거나 재연결 대기 중에 호출해도 인스턴스를 추가하지 않는다', () => {
    api.connect()
    api.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)

    lastSocket().triggerClose(1006)
    api.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('재연결 대기 중 online 이벤트가 발생하면 즉시 연결한다', () => {
    api.connect()
    lastSocket().triggerClose(1006)
    expect(FakeWebSocket.instances).toHaveLength(1)

    window.dispatchEvent(new Event('online'))
    expect(FakeWebSocket.instances).toHaveLength(2)

    // 대기 중이던 타이머는 취소되어 추가 연결이 생기지 않는다.
    vi.advanceTimersByTime(60_000)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })
})
