<script setup lang="ts">
import { ref, watch } from 'vue'
import { searchMembers, type WorkspaceMemberResponse } from '@/api/workspaceApi'
import { ownerConfirmationApi } from '@/api/ownerConfirmationApi'
import { useRoute } from 'vue-router'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; sent: [] }>()

const route = useRoute()
const workspaceId = () => {
  const v = route.params.workspaceId
  return Array.isArray(v) ? v[0] || '' : v || ''
}

const keyword = ref('')
const members = ref<WorkspaceMemberResponse[]>([])
const selectedMember = ref<WorkspaceMemberResponse | null>(null)
const questionText = ref('')
const isSending = ref(false)
const error = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(keyword, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!val.trim()) {
    members.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    try {
      members.value = await searchMembers(workspaceId(), val.trim())
    } catch {
      members.value = []
    }
  }, 300)
})

watch(() => props.isOpen, (open) => {
  if (open) {
    keyword.value = ''
    members.value = []
    selectedMember.value = null
    questionText.value = ''
    error.value = ''
  }
})

function selectMember(m: WorkspaceMemberResponse) {
  selectedMember.value = m
  keyword.value = ''
  members.value = []
}

function clearSelection() {
  selectedMember.value = null
}

async function handleSend() {
  if (!selectedMember.value || !questionText.value.trim()) return
  isSending.value = true
  error.value = ''
  try {
    await ownerConfirmationApi.sendDirectQuestion({
      assignedOwnerId: selectedMember.value.userId,
      questionContent: questionText.value.trim(),
    })
    emit('sent')
    emit('close')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '전송에 실패했습니다.'
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="dq-overlay" @click.self="emit('close')">
    <div class="dq-modal">
      <div class="dq-header">
        <h3>담당자에게 질문하기</h3>
        <button class="dq-close" @click="emit('close')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="dq-body">
        <label class="dq-label">담당자 선택</label>

        <div v-if="selectedMember" class="dq-selected">
          <span class="dq-chip">
            {{ selectedMember.name }} / {{ selectedMember.department }} - {{ selectedMember.position }}
            <button class="dq-chip-remove" @click="clearSelection">×</button>
          </span>
        </div>

        <div v-else class="dq-search-wrap">
          <input
            v-model="keyword"
            class="dq-input"
            type="text"
            placeholder="이름으로 멤버 검색..."
          />
          <ul v-if="members.length > 0" class="dq-dropdown">
            <li
              v-for="m in members"
              :key="m.userId"
              class="dq-dropdown-item"
              @click="selectMember(m)"
            >
              <strong>{{ m.name }}</strong>
              <span class="dq-meta">{{ m.department }} - {{ m.position }}</span>
            </li>
          </ul>
        </div>

        <label class="dq-label" style="margin-top: 16px;">질문 내용</label>
        <textarea
          v-model="questionText"
          class="dq-textarea"
          rows="4"
          placeholder="담당자에게 전달할 질문을 입력하세요..."
        ></textarea>

        <p v-if="error" class="dq-error">{{ error }}</p>
      </div>

      <div class="dq-footer">
        <button class="dq-btn dq-btn--cancel" @click="emit('close')">취소</button>
        <button
          class="dq-btn dq-btn--send"
          :disabled="!selectedMember || !questionText.trim() || isSending"
          @click="handleSend"
        >
          {{ isSending ? '전송 중...' : '질문 전송' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dq-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
}
.dq-modal {
  background: #fff; border-radius: 12px; width: 480px; max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.dq-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px 0;
}
.dq-header h3 { margin: 0; font-size: 18px; font-weight: 700; }
.dq-close {
  background: none; border: none; cursor: pointer; color: #64748b; padding: 4px;
}
.dq-body { padding: 16px 24px; }
.dq-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
.dq-search-wrap { position: relative; }
.dq-input {
  width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px;
  font-size: 14px; outline: none; box-sizing: border-box;
}
.dq-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.dq-dropdown {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
  margin-top: 4px; max-height: 200px; overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1); list-style: none; padding: 4px 0;
}
.dq-dropdown-item {
  padding: 10px 14px; cursor: pointer; display: flex; align-items: center; gap: 8px;
}
.dq-dropdown-item:hover { background: #f3f4f6; }
.dq-dropdown-item strong { font-size: 14px; }
.dq-meta { font-size: 12px; color: #6b7280; }
.dq-selected { margin-bottom: 4px; }
.dq-chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: #eff6ff; color: #1d4ed8; padding: 6px 12px;
  border-radius: 20px; font-size: 13px; font-weight: 500;
}
.dq-chip-remove {
  background: none; border: none; color: #1d4ed8; cursor: pointer;
  font-size: 16px; line-height: 1; padding: 0 2px;
}
.dq-textarea {
  width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px;
  font-size: 14px; resize: vertical; outline: none; font-family: inherit; box-sizing: border-box;
}
.dq-textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.dq-error { color: #dc2626; font-size: 13px; margin-top: 8px; }
.dq-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 24px; border-top: 1px solid #f3f4f6;
}
.dq-btn {
  padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;
  border: none; cursor: pointer;
}
.dq-btn--cancel { background: #f3f4f6; color: #374151; }
.dq-btn--cancel:hover { background: #e5e7eb; }
.dq-btn--send { background: #2563eb; color: #fff; }
.dq-btn--send:hover { background: #1d4ed8; }
.dq-btn--send:disabled { background: #93c5fd; cursor: not-allowed; }
</style>
