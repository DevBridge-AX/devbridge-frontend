<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import CitationPanel from './CitationPanel.vue'
import type { MessageCitation } from './CitationPanel.vue'

const props = defineProps<{
  role: 'user' | 'assistant'
  text: string
  citations?: MessageCitation[]
  isStreaming?: boolean
  isError?: boolean
  isOwnerAnswer?: boolean
  ownerName?: string
}>()

const emit = defineEmits<{
  selectCitation: [citation: MessageCitation]
}>()

marked.setOptions({ breaks: true, gfm: true })

const renderedHtml = computed(() => {
  if (props.role === 'user') return ''
  const raw = marked.parse(props.text) as string
  return DOMPurify.sanitize(raw)
})

function handleSelectCitation(citation: MessageCitation) {
  emit('selectCitation', citation)
}

// ── Error sanitization ──────────────────────────────────────
const ERROR_PATTERNS = [
  'pymysql.err', 'ProgrammingError', 'Table.*doesn\'t exist',
  'SQLAlchemy', 'InternalError', 'OperationalError',
  'database', 'DatabaseError', 'DataError',
]
function isRawError(text: string): boolean {
  return ERROR_PATTERNS.some(p => new RegExp(p, 'i').test(text))
}

const sanitizedText = computed(() => {
  if (!props.isError) return props.text
  const t = props.text
  if (isRawError(t)) {
    return '지식 검색을 완료하지 못했습니다. 문서 인덱스가 아직 준비되지 않았거나 AI 검색 테이블이 초기화되지 않았습니다. 문서 분석 상태를 확인한 뒤 다시 시도해 주세요.'
  }
  return t
})

const isRawServerError = computed(() => props.isError && isRawError(props.text))
</script>

<template>
  <div class="message-row" :class="[props.role]">
    <!-- Error Card for raw server errors -->
    <div v-if="props.isError" class="msg-error-card">
      <div class="msg-error-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="msg-error-body">
        <strong>지식 검색을 완료하지 못했습니다</strong>
        <p>{{ sanitizedText }}</p>
        <span v-if="isRawServerError" class="msg-error-hint">관리자 확인 필요</span>
      </div>
    </div>

    <!-- Owner badge if applicable -->
    <div v-else-if="props.isOwnerAnswer && props.ownerName" class="message-owner-badge">
      👤 {{ props.ownerName }}님의 답변
    </div>

    <!-- Normal message bubble -->
    <div v-if="!props.isError" class="message-bubble" :class="[props.role, { 'owner-answer-bubble': props.isOwnerAnswer }]">
      <div v-if="props.role === 'user'" class="msg-user-text">{{ props.text }}</div>
      <div
        v-else
        class="markdown-body"
        :class="{ 'streaming-text': props.isStreaming }"
        v-html="renderedHtml"
      ></div>
      <CitationPanel
        v-if="props.citations && props.citations.length > 0"
        :citations="props.citations"
        @select-citation="handleSelectCitation"
      />
    </div>
  </div>
</template>
