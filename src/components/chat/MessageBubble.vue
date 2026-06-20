<script setup lang="ts">
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

function handleSelectCitation(citation: MessageCitation) {
  emit('selectCitation', citation)
}
</script>

<template>
  <div class="message-row" :class="[props.role]">
    <div
      class="message-bubble"
      :class="{
        'error-bubble': props.isError,
        'owner-answer-bubble': props.isOwnerAnswer,
      }"
    >
      <!-- Owner badge if applicable -->
      <div v-if="props.isOwnerAnswer && props.ownerName" class="message-owner-badge">
        👤 {{ props.ownerName }}님의 답변
      </div>

      <!-- Text Content -->
      <div :class="{ 'streaming-text': props.isStreaming }">
        {{ props.text }}
      </div>

      <!-- Citations Panel -->
      <CitationPanel
        v-if="props.citations && props.citations.length > 0"
        :citations="props.citations"
        @select-citation="handleSelectCitation"
      />
    </div>
  </div>
</template>
