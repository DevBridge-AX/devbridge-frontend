import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { ConfirmOptions, ConfirmState, ToastItem, ToastType } from '@/types/ui'

const DEFAULT_TOAST_TIMEOUT = 3000
const ERROR_TOAST_TIMEOUT = 4000

// ─── Shared UI State (Pinia) ─────────────────────────────────────────────────
// 토스트와 확인 다이얼로그의 전역 상태만 관리합니다.

function createClosedConfirmState(): ConfirmState {
  return {
    open: false,
    title: '',
    message: '',
    confirmText: '확인',
    cancelText: '취소',
    danger: false,
  }
}

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<ToastItem[]>([])
  const confirmState = ref<ConfirmState>(createClosedConfirmState())

  let nextToastId = 1
  const toastTimers = new Map<number, ReturnType<typeof setTimeout>>()
  let confirmResolver: ((result: boolean) => void) | null = null

  function removeToast(id: number): void {
    const timer = toastTimers.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      toastTimers.delete(id)
    }
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function pushToast(type: ToastType, message: string, timeout?: number): number {
    const id = nextToastId++
    toasts.value.push({ id, type, message })

    const duration = timeout ?? (type === 'error' ? ERROR_TOAST_TIMEOUT : DEFAULT_TOAST_TIMEOUT)
    toastTimers.set(
      id,
      setTimeout(() => removeToast(id), duration),
    )
    return id
  }

  function resolveConfirm(result: boolean): void {
    const resolver = confirmResolver
    confirmResolver = null
    confirmState.value = { ...confirmState.value, open: false }
    resolver?.(result)
  }

  function openConfirm(options: ConfirmOptions): Promise<boolean> {
    // 이미 열려 있는 확인창은 취소(false)로 종료한다.
    if (confirmResolver) {
      resolveConfirm(false)
    }

    confirmState.value = {
      open: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText ?? '확인',
      cancelText: options.cancelText ?? '취소',
      danger: options.danger ?? false,
    }

    return new Promise<boolean>((resolve) => {
      confirmResolver = resolve
    })
  }

  return {
    toasts,
    confirmState,
    pushToast,
    removeToast,
    openConfirm,
    resolveConfirm,
  }
})
