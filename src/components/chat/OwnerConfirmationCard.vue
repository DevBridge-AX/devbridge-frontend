<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  ownerName: string | null
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const isVisible = computed(() => !!props.ownerName)
</script>

<template>
  <div v-if="isVisible" class="owner-confirmation-overlay">
    <div class="owner-confirmation-card">
      <div class="owner-confirmation-content">
        <div class="owner-confirmation-avatar">🙋‍♂️</div>
        <div class="owner-confirmation-text">
          <h3>담당자 연결 제안</h3>
          <p>{{ props.ownerName }}님에게 질문을 전달할까요?</p>
        </div>
      </div>
      <div class="owner-confirmation-actions">
        <button type="button" class="owner-btn-cancel" @click="emit('cancel')">
          취소
        </button>
        <button type="button" class="owner-btn-confirm" @click="emit('confirm')">
          전달하기
        </button>
      </div>
    </div>
  </div>
</template>
