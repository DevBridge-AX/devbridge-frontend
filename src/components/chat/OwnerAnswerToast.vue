<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true, gfm: true })

const emit = defineEmits<{
  clickToast: [messageId: string]
}>()

const visible = ref(false)
const ownerName = ref('')
const content = ref('')
const originalMessageId = ref('')

const parsedContent = computed(() => {
  const raw = marked.parse(content.value) as string
  return DOMPurify.sanitize(raw)
})

let autoHideTimer: ReturnType<typeof setTimeout> | null = null

interface OwnerAnswerEventDetail {
  originalMessageId: string
  content: string
  ownerName: string
}

function handleOwnerAnswer(e: Event) {
  const customEvent = e as CustomEvent<OwnerAnswerEventDetail>
  if (!customEvent.detail) return

  ownerName.value = customEvent.detail.ownerName || '담당자'
  content.value = customEvent.detail.content || ''
  originalMessageId.value = customEvent.detail.originalMessageId || ''
  visible.value = true

  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
  }

  autoHideTimer = setTimeout(() => {
    visible.value = false
  }, 7000)
}

function closeToast(e: Event) {
  e.stopPropagation()
  visible.value = false
}

function handleClick() {
  emit('clickToast', originalMessageId.value)
  
  // Try scrolling to target message bubble DOM
  const targetId = `msg-${originalMessageId.value}-answer`
  const el = document.getElementById(targetId)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Add temporary highlight effect
    el.style.transition = 'background-color 0.5s ease'
    el.style.backgroundColor = '#fef08a'
    setTimeout(() => {
      el.style.backgroundColor = ''
    }, 1500)
  }
  
  visible.value = false
}

onMounted(() => {
  window.addEventListener('owner-answer', handleOwnerAnswer)
})

onUnmounted(() => {
  window.removeEventListener('owner-answer', handleOwnerAnswer)
  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
  }
})
</script>

<template>
  <div class="toast-container">
    <div v-if="visible" class="owner-toast" role="alert" @click="handleClick">
      <div class="toast-header">
        <span class="toast-title">🔔 담당자 답변 도착</span>
        <button type="button" class="toast-close" aria-label="닫기" @click="closeToast">
          &times;
        </button>
      </div>
      <div class="toast-body">
        <strong>{{ ownerName }}</strong>님의 답변이 도착했습니다:
        <div class="markdown-body" style="margin: 4px 0 0; opacity: 0.9;" v-html="parsedContent"></div>
      </div>
      <div class="toast-hint">클릭하면 답변으로 이동합니다.</div>
    </div>
  </div>
</template>
