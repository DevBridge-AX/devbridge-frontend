import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useUiStore } from '@/state/useUiStore'

describe('useToast', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('success/error 호출 시 type과 message가 맞는 토스트를 고유 id로 추가한다', () => {
    const uiStore = useUiStore()
    const toast = useToast()

    toast.success('저장했습니다.')
    toast.error('실패했습니다.')

    expect(uiStore.toasts).toHaveLength(2)
    expect(uiStore.toasts[0]).toMatchObject({ type: 'success', message: '저장했습니다.' })
    expect(uiStore.toasts[1]).toMatchObject({ type: 'error', message: '실패했습니다.' })
    expect(uiStore.toasts[0]?.id).not.toBe(uiStore.toasts[1]?.id)
  })

  it('타임아웃 후 자동 제거되고 removeToast는 즉시 제거한다', () => {
    const uiStore = useUiStore()
    const toast = useToast()

    toast.success('자동 제거')
    toast.info('수동 제거')
    const manualId = uiStore.toasts[1]?.id
    expect(manualId).toBeDefined()

    if (manualId !== undefined) {
      uiStore.removeToast(manualId)
    }
    expect(uiStore.toasts).toHaveLength(1)

    vi.advanceTimersByTime(2999)
    expect(uiStore.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(uiStore.toasts).toHaveLength(0)
  })

  it('error 토스트는 4000ms 후 제거된다', () => {
    const uiStore = useUiStore()

    useToast().error('오류')

    vi.advanceTimersByTime(3999)
    expect(uiStore.toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(uiStore.toasts).toHaveLength(0)
  })
})

describe('useConfirm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resolveConfirm(true/false) 결과로 resolve된다', async () => {
    const uiStore = useUiStore()
    const { confirm } = useConfirm()

    const accepted = confirm({ title: '삭제', message: '삭제할까요?' })
    expect(uiStore.confirmState.open).toBe(true)
    expect(uiStore.confirmState.confirmText).toBe('확인')
    expect(uiStore.confirmState.cancelText).toBe('취소')
    expect(uiStore.confirmState.danger).toBe(false)
    uiStore.resolveConfirm(true)
    await expect(accepted).resolves.toBe(true)
    expect(uiStore.confirmState.open).toBe(false)

    const rejected = confirm({ title: '삭제', message: '삭제할까요?', danger: true })
    expect(uiStore.confirmState.danger).toBe(true)
    uiStore.resolveConfirm(false)
    await expect(rejected).resolves.toBe(false)
  })

  it('확인창이 열린 상태에서 다시 열면 이전 확인창은 false로 resolve된다', async () => {
    const uiStore = useUiStore()
    const { confirm } = useConfirm()

    const first = confirm({ title: '첫 번째', message: 'a' })
    const second = confirm({ title: '두 번째', message: 'b' })

    await expect(first).resolves.toBe(false)
    expect(uiStore.confirmState.open).toBe(true)
    expect(uiStore.confirmState.title).toBe('두 번째')

    uiStore.resolveConfirm(true)
    await expect(second).resolves.toBe(true)
  })
})
