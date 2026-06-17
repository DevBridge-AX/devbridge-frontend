<script setup lang="ts">
import { computed } from 'vue'

// Rule: types are co-located at the top of the component or service.
export interface MessageCitation {
  sourceType: 'document' | 'git_commit' | 'db_schema'
  sourceId: number
  title: string
  similarityScore: number
}

const props = defineProps<{
  citations: MessageCitation[]
}>()

const emit = defineEmits<{
  selectCitation: [citation: MessageCitation]
}>()

function getIcon(type: 'document' | 'git_commit' | 'db_schema'): string {
  switch (type) {
    case 'document':
      return '📄'
    case 'git_commit':
      return '🔀'
    case 'db_schema':
      return '🗄️'
    default:
      return '🔗'
  }
}

function getTypeName(type: 'document' | 'git_commit' | 'db_schema'): string {
  switch (type) {
    case 'document':
      return '문서'
    case 'git_commit':
      return 'Git 커밋'
    case 'db_schema':
      return 'DB 스키마'
    default:
      return '출처'
  }
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

const hasCitations = computed(() => props.citations && props.citations.length > 0)
</script>

<template>
  <div v-if="hasCitations" class="citation-panel">
    <div class="citation-header">참조 근거 문서</div>
    <div class="citation-list">
      <button
        v-for="citation in props.citations"
        :key="`${citation.sourceType}-${citation.sourceId}`"
        type="button"
        class="citation-card"
        :title="`${getTypeName(citation.sourceType)}: ${citation.title} (유사도: ${formatScore(citation.similarityScore)})`"
        @click="emit('selectCitation', citation)"
      >
        <span class="citation-icon">{{ getIcon(citation.sourceType) }}</span>
        <span class="citation-title">{{ citation.title }}</span>
        <span class="citation-score">{{ formatScore(citation.similarityScore) }}</span>
      </button>
    </div>
  </div>
</template>
