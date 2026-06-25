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

const deletingSourceId = ref<string | null>(null)

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

async function handleDeleteSource(source: DataSourceItem) {
  if (deletingSourceId.value) return

  const confirmed = window.confirm(
    `"${source.sourceName}" 데이터 소스를 삭제하시겠습니까?`,
  )
  if (!confirmed) return

  deletingSourceId.value = source.id
  clearFeedback()

  try {
    await dataSourceService.deleteDataSource(source.id, workspaceId.value)
    showFeedback('success', `데이터 소스(${source.sourceName})가 삭제되었습니다.`)
    await fetchSources()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '데이터 소스 삭제에 실패했습니다.'
    showFeedback('error', msg)
  } finally {
    deletingSourceId.value = null
  }
}

onMounted(() => {
  void fetchSources()
})
</script>

<template>
  <AppLayout>
    <div class="ds-shell">
      <div class="ds-page">
      <!-- Hero Header -->
      <header class="ds-hero">
        <div class="ds-hero-left">
          <p class="ds-hero-lbl">Data Sources</p>
          <h1>지식 데이터 소스 관리</h1>
          <p>Git 레포지토리 URL을 연동하거나 프로젝트 문서를 직접 업로드하여 DevBridge RAG 지식베이스에 동기화할 수 있습니다.</p>
        </div>
      </header>

      <!-- Feedback Toast Area -->
      <div v-if="feedbackMessage" class="ds-msg" :class="[feedbackType]">
        {{ feedbackMessage }}
      </div>

      <!-- Main Content Grid -->
      <div class="ds-content-grid">
        <!-- Left: Configuration Panels -->
        <div class="ds-config-col">
          <!-- Git Integration -->
          <div class="ds-card">
            <div class="ds-card-hd">
              <span class="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/>
                  <line x1="6" y1="9" x2="6" y2="21"/>
                </svg>
              </span>
              <h3>Git 레포지토리 연동</h3>
            </div>
            <form @submit.prevent="handleConnectGit" class="ds-card-body">
              <div class="ds-field">
                <label>Git URL</label>
                <input
                  v-model="gitUrl"
                  type="url"
                  placeholder="https://github.com/user/repo.git"
                  required
                />
              </div>
              <button
                type="submit"
                class="ds-btn ds-btn-pri"
                :disabled="isLoading || !gitUrl.trim()"
              >
                {{ isLoading ? '연동 중...' : '저장소 연동하기' }}
              </button>
            </form>
          </div>

          <!-- Document Upload -->
          <div class="ds-card">
            <div class="ds-card-hd">
              <span class="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </span>
              <h3>문서 파일 업로드</h3>
            </div>
            <div class="ds-card-body">
              <!-- Drag and Drop Box -->
              <div
                class="ds-upload"
                :class="{ active: isDragActive }"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
                @click="fileInput?.click()"
              >
                <input
                  ref="fileInput"
                  type="file"
                  class="ds-upload-file"
                  accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx,.md"
                  @change="onFileSelect"
                />
                <div class="ds-upload-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <strong v-if="selectedFile">{{ selectedFile.name }}</strong>
                <strong v-else>파일을 드래그하거나 클릭하여 선택하세요</strong>
                <span>PDF, DOCX, TXT, CSV, XLSX, PPTX 지원 (최대 50MB)</span>
              </div>

              <!-- Metadata Description -->
              <div class="ds-field">
                <label>문서 설명 (선택)</label>
                <textarea
                  v-model="docDescription"
                  placeholder="이 문서의 요약이나 설명을 적어주세요."
                  rows="3"
                />
              </div>

              <!-- Upload Submit -->
              <button
                type="button"
                class="ds-btn ds-btn-pri"
                :disabled="isLoading || !selectedFile"
                @click="handleUploadDoc"
              >
                {{ isLoading ? '업로드 및 분석 중...' : '문서 지식 동기화' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Connected Data Sources -->
        <div class="ds-card">
          <div class="ds-card-hd">
            <span class="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
              </svg>
            </span>
            <h3>연동된 데이터 소스 목록</h3>
          </div>
          <div v-if="sources.length === 0" class="ds-empty">
            <div class="ds-empty-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
              </svg>
            </div>
            등록된 데이터 소스가 없습니다.
          </div>
          <div v-else class="ds-list">
            <article
              v-for="source in sources"
              :key="source.id"
              class="ds-item"
            >
              <div class="ds-item-ico">
                <svg v-if="source.sourceType === 'GIT'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="ds-item-body">
                <span class="title" :title="source.sourceName">{{ source.sourceName }}</span>
                <span class="meta">유형: {{ source.sourceType }}</span>
              </div>
              <span class="ds-status" :class="[source.status.toLowerCase()]">
                {{ source.status === 'CONNECTED' ? 'Connected' : source.status === 'PENDING' ? 'Pending' : 'Failed' }}
              </span>
              <button
                v-if="source.status === 'FAILED'"
                type="button"
                class="ds-del-btn"
                :disabled="deletingSourceId === source.id"
                aria-label="데이터 소스 삭제"
                @click="handleDeleteSource(source)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </article>
          </div>
        </div>
      </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.ds-shell { min-height: calc(100vh - 56px); background: var(--page-bg); padding: 24px 32px 40px; }
.ds-page { display: flex; flex-direction: column; gap: 20px; max-width: 1480px; margin: 0 auto; }
.ds-content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
.ds-config-col { display: flex; flex-direction: column; gap: 24px; }
.ds-card-body { display: flex; flex-direction: column; gap: 16px; }
.ds-del-btn {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff); color: var(--danger-text, #D45D5D); cursor: pointer;
  display: grid; place-items: center; transition: all .15s;
}
.ds-del-btn:hover { background: var(--danger-bg, #FBF0F0); border-color: var(--danger-text, #D45D5D); }
.ds-del-btn:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 960px) {
  .ds-content-grid { grid-template-columns: 1fr; }
}
</style>
