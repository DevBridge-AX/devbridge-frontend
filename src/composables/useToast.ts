import { useUiStore } from '@/state/useUiStore'

/** 전역 토스트 알림 헬퍼. alert() 대체용. */
export function useToast() {
  const uiStore = useUiStore()

  function success(message: string): void {
    uiStore.pushToast('success', message)
  }

  function error(message: string): void {
    uiStore.pushToast('error', message)
  }

  function info(message: string): void {
    uiStore.pushToast('info', message)
  }

  return { success, error, info }
}
