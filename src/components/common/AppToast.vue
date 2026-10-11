<script setup lang="ts">
import { useUiStore } from '@/state/useUiStore'

const uiStore = useUiStore()
</script>

<template>
  <div class="app-toast-container">
    <TransitionGroup name="app-toast">
      <div
        v-for="toast in uiStore.toasts"
        :key="toast.id"
        class="app-toast"
        :class="`app-toast-${toast.type}`"
        :role="toast.type === 'error' ? 'alert' : 'status'"
      >
        <span class="app-toast-message">{{ toast.message }}</span>
        <button
          type="button"
          class="app-toast-close"
          aria-label="닫기"
          @click="uiStore.removeToast(toast.id)"
        >
          &times;
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.app-toast-container {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  max-width: 360px;
}

.app-toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #3b82f6;
  border-radius: 14px;
  padding: 12px 12px 12px 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
}

.app-toast-success {
  border-left-color: #15803d;
}

.app-toast-error {
  border-left-color: #ef4444;
}

.app-toast-info {
  border-left-color: #3b82f6;
}

.app-toast-message {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.5;
  white-space: pre-line;
  word-break: break-word;
}

.app-toast-close {
  flex-shrink: 0;
  background: transparent;
  border: 0;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.app-toast-close:hover {
  background: #f1f5f9;
  color: #475569;
}

/* ── Transition ───────────────────────────────────────────────── */
.app-toast-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.app-toast-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.app-toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.app-toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}

.app-toast-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Dark Theme ───────────────────────────────────────────────── */
:global(.dark-theme) .app-toast {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

:global(.dark-theme) .app-toast-message {
  color: #f1f5f9;
}

:global(.dark-theme) .app-toast-close {
  color: #64748b;
}

:global(.dark-theme) .app-toast-close:hover {
  background: #334155;
  color: #e2e8f0;
}
</style>
