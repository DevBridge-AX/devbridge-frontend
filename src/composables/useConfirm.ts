import { useUiStore } from '@/state/useUiStore'
import type { ConfirmOptions } from '@/types/ui'

/** 전역 확인 다이얼로그 헬퍼. window.confirm() 대체용. 확인 시 true, 취소 시 false로 resolve된다. */
export function useConfirm() {
  const uiStore = useUiStore()

  function confirm(options: ConfirmOptions): Promise<boolean> {
    return uiStore.openConfirm(options)
  }

  return { confirm }
}
