<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import MessageBubble from './MessageBubble.vue'
import SearchingIndicator from './SearchingIndicator.vue'
import type { ChatMessage } from '@/state/chatStore'
import type { MessageCitation } from './CitationPanel.vue'

const props = defineProps<{
  messages: ChatMessage[]
  streamingMessage: { id: string; text: string } | null
  isSearching: boolean
}>()

const emit = defineEmits<{
  selectCitation: [citation: MessageCitation]
}>()

const viewportRef = ref<HTMLDivElement | null>(null)

function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
  nextTick(() => {
    if (viewportRef.value) {
      viewportRef.value.scrollTo({
        top: viewportRef.value.scrollHeight,
        behavior,
      })
    }
  })
}

function handleSelectCitation(citation: MessageCitation) {
  emit('selectCitation', citation)
}

watch(
  () => props.messages.length,
  () => {
    scrollToBottom()
  }
)

watch(
  () => props.streamingMessage?.text,
  () => {
    scrollToBottom()
  }
)

watch(
  () => props.isSearching,
  (val) => {
    if (val) {
      scrollToBottom()
    }
  }
)

onMounted(() => {
  scrollToBottom('instant')
})
</script>

<template>
  <div ref="viewportRef" class="chat-viewport">
    <div class="chat-inner">
      <!-- Chat Messages List -->
      <MessageBubble
        v-for="msg in props.messages"
        :id="`msg-${msg.id}`"
        :key="msg.id"
        :role="msg.role"
        :text="msg.text"
        :citations="msg.citations"
        :is-error="msg.isError"
        :is-owner-answer="msg.isOwnerAnswer"
        :owner-name="msg.ownerName"
        @select-citation="handleSelectCitation"
      />

      <!-- Streaming Assistant Message Bubble -->
      <MessageBubble
        v-if="props.streamingMessage"
        :role="'assistant'"
        :text="props.streamingMessage.text"
        :is-streaming="true"
      />

      <!-- Searching Indicator -->
      <SearchingIndicator v-if="props.isSearching" />
    </div>
  </div>
</template>
