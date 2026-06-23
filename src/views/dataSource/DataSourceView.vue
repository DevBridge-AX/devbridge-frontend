<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { dataSourceService } from '@/services/dataSourceService'
import { documentService } from '@/services/documentService'
import { useAuthStore } from '@/state/authStore'
import type { DataSourceItem } from '@/api/dataSourceApi'
import '@/assets/styles/dataSource.css'

const route = useRoute()
const authStore = useAuthStore()

// State
const sources = ref<DataSourceItem[]>([])
const isLoading = ref(false)
const gitUrl = ref('')
const selectedFile = ref<File | null>(null)
const docDescription = ref('')
const isDragActive = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const feedbackType = ref<'success' | 'error' | null>(null)
const feedbackMessage = ref('')

const workspaceId = computed<string>(() => {
  const value = route.params.workspaceId
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return value || ''
})

const currentUser = computed(() => authStore.currentUser)

// Fetch all data sources for workspace
async function fetchSources() {
  if (!workspaceId.value) {
    showFeedback('error', '워크스페이스 정보가 없습니다.')
    return
  }
  try {
    sources.value = await dataSourceService.fetchDataSources(workspaceId.value)
  } catch (err) {
    console.error('Failed to load data sources:', err)
  }
}

// Connect Git Repo
async function handleConnectGit() {
  if (!gitUrl.value.trim()) return
  isLoading.value = true
  clearFeedback()

  try {
    const response = await dataSourceService.connectDataSource({
      workspaceId: workspaceId.value,
      sourceType: 'GIT',
      sourceName: gitUrl.value.trim(),
    })
    
    showFeedback('success', `Git 저장소(${response.sourceName})가 등록되었습니다.`)
    gitUrl.value = ''
    
    // Refresh list
    await fetchSources()
    
    // In mock mode, poll to simulate indexed state change
    if (import.meta.env.VITE_WS_MOCK === 'true') {
      pollMockSources()
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Git 연동에 실패했습니다.'
    showFeedback('error', msg)
  } finally {
    isLoading.value = false
  }
}

// Drag & Drop Handlers
function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragActive.value = true
}

function onDragLeave() {
  isDragActive.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragActive.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    selectedFile.value = e.dataTransfer.files[0] || null
  }
}

function onFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0] || null
  }
}

// Upload Document file
async function handleUploadDoc() {
  const file = selectedFile.value
  if (!file) return
  isLoading.value = true
  clearFeedback()

  try {
    // If mock mode, register using connection API directly
    const isMock = import.meta.env.VITE_WS_MOCK === 'true'
    
    if (isMock) {
      await dataSourceService.connectDataSource({
        workspaceId: workspaceId.value,
        sourceType: 'DOC',
        sourceName: file.name,
      })
    } else {
      // In production, upload the document file (which registers DOC dataSource and uploads file)
      await documentService.uploadWorkspaceDocument({
        workspaceId: workspaceId.value,
        uploadedById: currentUser.value?.employeeId || null,
        documentType: 'DOC',
        description: docDescription.value || '',
        file: file,
      })
    }
    
    showFeedback('success', `문서 파일(${file.name})이 성공적으로 업로드되었습니다.`)
    selectedFile.value = null
    docDescription.value = ''
    
    await fetchSources()

    if (isMock) {
      pollMockSources()
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '문서 업로드에 실패했습니다.'
    showFeedback('error', msg)
  } finally {
    isLoading.value = false
  }
}

// Poll mock sources to reflect transition from pending -> indexed
let pollInterval: ReturnType<typeof setInterval> | null = null
function pollMockSources() {
  if (pollInterval) clearInterval(pollInterval)
  pollInterval = setInterval(async () => {
    await fetchSources()
    // Stop polling once no pending status is left
    const hasPending = sources.value.some((s) => s.status === 'pending')
    if (!hasPending && pollInterval) {
      clearInterval(pollInterval)
    }
  }, 1000)
}

function showFeedback(type: 'success' | 'error', message: string) {
  feedbackType.value = type
  feedbackMessage.value = message
  
  // Auto clear success message
  if (type === 'success') {
    setTimeout(() => {
      if (feedbackMessage.value === message) {
        clearFeedback()
      }
    }, 4000)
  }
}

function clearFeedback() {
  feedbackType.value = null
  feedbackMessage.value = ''
}

onMounted(() => {
  void fetchSources()
})
</script>

<template>
  <AppLayout>
    <div class="datasource-page">
      <!-- Hero Header -->
      <section class="datasource-hero">
        <h1>지식 데이터 소스 관리</h1>
        <p>
          Git 레포지토리 URL을 연동하거나 프로젝트 문서를 직접 업로드하여
          DevBridge RAG 지식베이스에 동기화할 수 있습니다.
        </p>
      </section>

      <!-- Feedback Toast Area -->
      <div
        v-if="feedbackMessage"
        class="feedback-msg"
        :class="[feedbackType]"
      >
        {{ feedbackMessage }}
      </div>

      <!-- Main Content Grid -->
      <div class="datasource-content">
        <!-- Left: Configuration Panels -->
        <div class="config-side" style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Git Integration -->
          <div class="datasource-panel">
            <h2>Git 레포지토리 연동</h2>
            <form @submit.prevent="handleConnectGit" style="display: flex; flex-direction: column; gap: 16px;">
              <label class="datasource-field">
                <span>Git URL</span>
                <input
                  v-model="gitUrl"
                  type="url"
                  class="datasource-input"
                  placeholder="https://github.com/user/repo.git"
                  required
                />
              </label>
              <button
                type="submit"
                class="datasource-btn"
                :disabled="isLoading || !gitUrl.trim()"
              >
                {{ isLoading ? '연동 중...' : '저장소 연동하기' }}
              </button>
            </form>
          </div>

          <!-- Document Upload -->
          <div class="datasource-panel">
            <h2>문서 파일 업로드</h2>
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <!-- Drag and Drop Box -->
              <div
                class="drag-drop-zone"
                :class="{ active: isDragActive }"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
                @click="fileInput?.click()"
              >
                <input
                  ref="fileInput"
                  type="file"
                  style="display: none;"
                  accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx"
                  @change="onFileSelect"
                />
                <div class="drag-drop-icon">📁</div>
                <div class="drag-drop-text">
                  <strong v-if="selectedFile">{{ selectedFile.name }}</strong>
                  <strong v-else>파일을 드래그하거나 클릭하여 선택하세요</strong>
                  <span>PDF, DOCX, TXT, CSV, XLSX, PPTX 지원 (최대 50MB)</span>
                </div>
              </div>

              <!-- Metadata Description -->
              <label class="datasource-field">
                <span>문서 설명 (선택)</span>
                <textarea
                  v-model="docDescription"
                  class="datasource-textarea"
                  placeholder="이 문서의 요약이나 설명을 적어주세요."
                  rows="3"
                />
              </label>

              <!-- Upload Submit -->
              <button
                type="button"
                class="datasource-btn"
                :disabled="isLoading || !selectedFile"
                @click="handleUploadDoc"
              >
                {{ isLoading ? '업로드 및 분석 중...' : '문서 지식 동기화' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Connected Data Sources -->
        <div class="datasource-panel">
          <h2>연동된 데이터 소스 목록</h2>
          <div v-if="sources.length === 0" class="empty-state" style="padding: 40px; text-align: center; color: #64748b;">
            등록된 데이터 소스가 없습니다.
          </div>
          <div v-else class="source-list">
            <article
              v-for="source in sources"
              :key="source.id"
              class="source-item"
            >
              <div class="source-info">
                <div class="source-icon-wrap">
                  {{ source.sourceType === 'GIT' ? '🔀' : '📄' }}
                </div>
                <div class="source-details">
                  <span class="source-name" :title="source.sourceName">
                    {{ source.sourceName }}
                  </span>
                  <span class="source-meta">
                    유형: {{ source.sourceType }}
                  </span>
                </div>
              </div>

              <!-- Status Badge -->
              <span class="status-badge" :class="[source.status.toLowerCase()]">
                {{ source.status === 'indexed' ? 'Indexed' : source.status === 'pending' ? 'Pending' : 'Failed' }}
              </span>
            </article>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
