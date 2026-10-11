<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useUiStore } from '@/state/useUiStore'

const uiStore = useUiStore()

const cancelButtonRef = ref<HTMLButtonElement | null>(null)
const confirmButtonRef = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null

function cancel() {
  uiStore.resolveConfirm(false)
}

function confirm() {
  uiStore.resolveConfirm(true)
}

/** Tab / Shift+Tab 포커스를 취소·확인 두 버튼 사이로 가둔다. */
function trapFocus(event: KeyboardEvent) {
  const first = cancelButtonRef.value
  const last = confirmButtonRef.value
  if (!first || !last) return

  const active = document.activeElement
  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  } else if (active !== first && active !== last) {
    event.preventDefault()
    last.focus()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
    return
  }
  if (event.key === 'Tab') {
    trapFocus(event)
  }
}

watch(
  () => uiStore.confirmState.open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      document.addEventListener('keydown', handleKeydown)
      await nextTick()
      confirmButtonRef.value?.focus()
    } else {
      document.removeEventListener('keydown', handleKeydown)
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
)

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="uiStore.confirmState.open" class="app-confirm-overlay" @click.self="cancel">
      <div
        class="app-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-confirm-title"
      >
        <h2 id="app-confirm-title" class="app-confirm-title">{{ uiStore.confirmState.title }}</h2>
        <p class="app-confirm-message">{{ uiStore.confirmState.message }}</p>
        <div class="app-confirm-actions">
          <button ref="cancelButtonRef" type="button" class="app-confirm-btn" @click="cancel">
            {{ uiStore.confirmState.cancelText }}
          </button>
          <button
            ref="confirmButtonRef"
            type="button"
            class="app-confirm-btn app-confirm-btn-primary"
            :class="{ 'app-confirm-btn-danger': uiStore.confirmState.danger }"
            @click="confirm"
          >
            {{ uiStore.confirmState.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.app-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 3100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
}

.app-confirm-dialog {
  width: 100%;
  max-width: 400px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e8eaf2);
  border-radius: var(--card-radius, 14px);
  padding: 24px;
  box-shadow: var(--shadow-xl, 0 12px 40px rgba(27, 32, 49, 0.1));
  font-family: var(--font-ui, sans-serif);
}

.app-confirm-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-body, #1b2031);
}

.app-confirm-message {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary, #6b7191);
  white-space: pre-line;
  word-break: break-word;
}

.app-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.app-confirm-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  color: var(--text-body, #1b2031);
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e8eaf2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.app-confirm-btn:hover {
  background: var(--page-bg, #f6f7fb);
}

.app-confirm-btn:focus-visible {
  outline: 2px solid var(--brand-indigo, #5b52e3);
  outline-offset: 2px;
}

.app-confirm-btn-primary {
  color: #ffffff;
  background: var(--brand-indigo, #5b52e3);
  border-color: var(--brand-indigo, #5b52e3);
}

.app-confirm-btn-primary:hover {
  background: var(--brand-indigo, #5b52e3);
  filter: brightness(1.08);
}

.app-confirm-btn-danger {
  background: #ef4444;
  border-color: #ef4444;
}

.app-confirm-btn-danger:hover {
  background: #ef4444;
}

.app-confirm-btn-danger:focus-visible {
  outline-color: #ef4444;
}
</style>
