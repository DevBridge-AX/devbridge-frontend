<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { documentService } from '@/services/documentService'
import { gitService } from '@/services/gitService'
import { useAuthStore } from '@/state/authStore'
import type { DocumentItem } from '@/api/documentApi'
import type { GitCommitItem } from '@/api/gitApi'
import '@/assets/styles/documents.css'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const documents = ref<DocumentItem[]>([])
const selectedDocument = ref<DocumentItem | null>(null)

const activeKnowledgeTab = ref<'documents' | 'git' | 'ai'>('documents')
const gitCommits = ref<GitCommitItem[]>([])

const isLoading = ref(false)
const isUploading = ref(false)
const isUploadModalOpen = ref(false)
const isEditingDocument = ref(false)
const isUpdatingDocument = ref(false)
const isGitLoading = ref(false)

const errorMessage = ref('')
const uploadMessage = ref('')
const uploadDescription = ref('')
const gitErrorMessage = ref('')

const editTitle = ref('')
const editDocumentType = ref('REPORT')
const editDescription = ref('')
const editMessage = ref('')

const previewObjectUrl = ref('')
const previewContentType = ref<string | null>(null)
const isPreviewLoading = ref(false)
const previewErrorMessage = ref('')

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedUploadFile = ref<File | null>(null)
const selectedDocumentType = ref('REPORT')

const documentTypeOptions = [
  { value: 'REPORT', label: '보고서' },
  { value: 'MEETING_NOTE', label: '회의록' },
  { value: 'GUIDE', label: '지침' },
  { value: 'REFERENCE', label: '참고자료' },
  { value: 'ETC', label: '기타' },
]

const knowledgeTabs = [
  { key: 'documents', label: 'Documents' },
  { key: 'git', label: 'Git Changes' },
  { key: 'ai', label: 'AI Analysis' },
] as const

const workspaceId = computed(() => {
  const value = route.params.workspaceId
  return Array.isArray(value) ? value[0] : value
})

const uploadedById = computed(() => {
  return authStore.currentUser?.id ?? null
})

const totalDocumentCount = computed(() => documents.value.length)

const docSourceCount = computed(() => {
  return documents.value.filter((document) => document.sourceType === 'DOC')
    .length
})

const analyzedDocumentCount = computed(() => {
  return documents.value.filter(
    (document) => document.analysisStatus === 'COMPLETED',
  ).length
})

const pendingDocumentCount = computed(() => {
  return documents.value.filter(
    (document) =>
      document.analysisStatus === 'PENDING' ||
      document.analysisStatus === 'PROCESSING' ||
      document.analysisStatus === null,
  ).length
})

async function fetchDocuments() {
  if (!workspaceId.value) {
    errorMessage.value = '워크스페이스 정보가 없습니다.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    documents.value = await documentService.getDocumentsByWorkspace(
      workspaceId.value,
    )
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : '문서 목록을 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

async function fetchGitCommits() {
  isGitLoading.value = true
  gitErrorMessage.value = ''

  try {
    gitCommits.value = await gitService.getRecentCommits(20)
  } catch (error: unknown) {
    gitErrorMessage.value =
      error instanceof Error
        ? error.message
        : 'Git 변경사항을 불러오지 못했습니다.'
  } finally {
    isGitLoading.value = false
  }
}

function changeKnowledgeTab(tabKey: 'documents' | 'git' | 'ai') {
  activeKnowledgeTab.value = tabKey

  if (tabKey === 'git' && gitCommits.value.length === 0) {
    void fetchGitCommits()
  }
}

async function openDocumentDetail(documentId: string) {
  clearPreviewObjectUrl()
  resetEditDocumentForm()

  isPreviewLoading.value = true
  previewErrorMessage.value = ''

  try {
    selectedDocument.value = await documentService.getDocumentDetail(documentId)
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : '문서 상세 정보를 불러오지 못했습니다.'
    isPreviewLoading.value = false
    return
  }

  try {
    const previewResult =
      await documentService.getDocumentPreviewObjectUrl(documentId)

    previewObjectUrl.value = previewResult.objectUrl
    previewContentType.value =
      previewResult.contentType ?? selectedDocument.value.contentType
  } catch (error: unknown) {
    previewErrorMessage.value =
      error instanceof Error
        ? error.message
        : '문서 미리보기를 불러오지 못했습니다.'
  } finally {
    isPreviewLoading.value = false
  }
}

function closeDocumentDetail() {
  selectedDocument.value = null
  previewErrorMessage.value = ''
  resetEditDocumentForm()
  clearPreviewObjectUrl()
}

function clearPreviewObjectUrl() {
  if (previewObjectUrl.value) {
    URL.revokeObjectURL(previewObjectUrl.value)
  }

  previewObjectUrl.value = ''
  previewContentType.value = null
}

function goToDashboard() {
  if (!workspaceId.value) {
    return
  }

  router.push(`/workspaces/${workspaceId.value}/dashboard`)
}

function openUploadModal() {
  uploadMessage.value = ''
  selectedUploadFile.value = null
  selectedDocumentType.value = 'REPORT'
  uploadDescription.value = ''

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }

  isUploadModalOpen.value = true
}

function closeUploadModal() {
  if (isUploading.value) {
    return
  }

  isUploadModalOpen.value = false
  selectedUploadFile.value = null
  selectedDocumentType.value = 'REPORT'
  uploadDescription.value = ''
  uploadMessage.value = ''

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function openFilePicker() {
  uploadMessage.value = ''
  fileInputRef.value?.click()
}

function handleUploadFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null

  selectedUploadFile.value = file

  if (file) {
    uploadMessage.value = `${file.name} 파일이 선택되었습니다.`
  } else {
    uploadMessage.value = ''
  }
}

async function uploadSelectedDocument() {
  if (!workspaceId.value) {
    errorMessage.value = '워크스페이스 정보가 없습니다.'
    return
  }

  if (!selectedUploadFile.value) {
    uploadMessage.value = '업로드할 파일을 먼저 선택해 주세요.'
    return
  }

  isUploading.value = true
  errorMessage.value = ''
  uploadMessage.value = ''

  try {
    await documentService.uploadWorkspaceDocument({
      workspaceId: workspaceId.value,
      uploadedById: uploadedById.value,
      documentType: selectedDocumentType.value,
      description: uploadDescription.value,
      file: selectedUploadFile.value,
    })

    await fetchDocuments()
    closeUploadModal()
  } catch (error: unknown) {
    uploadMessage.value =
      error instanceof Error ? error.message : '문서 업로드에 실패했습니다.'
  } finally {
    isUploading.value = false
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return '미정'
  }

  return value.replace('T', ' ').slice(0, 16)
}

function formatFileSize(value: number | null) {
  if (value === null || value === undefined) {
    return '미정'
  }

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function getDocumentTypeLabel(type: string | null) {
  if (type === 'REPORT') {
    return '보고서'
  }

  if (type === 'MEETING_NOTE') {
    return '회의록'
  }

  if (type === 'GUIDE') {
    return '지침'
  }

  if (type === 'REFERENCE') {
    return '참고자료'
  }

  if (type === 'TECH') {
    return '기술 문서'
  }

  if (type === 'PLANNING') {
    return '기획 문서'
  }

  if (type === 'DESIGN') {
    return '디자인 문서'
  }

  if (type === 'MEETING') {
    return '회의록'
  }

  if (type === 'GIT') {
    return 'Git 문서'
  }

  if (type === 'ETC') {
    return '기타'
  }

  return '미분류'
}

function getAnalysisStatusLabel(status: string | null) {
  if (status === 'COMPLETED') {
    return '분석 완료'
  }

  if (status === 'PROCESSING') {
    return '분석 중'
  }

  if (status === 'PENDING') {
    return '분석 대기'
  }

  if (status === 'FAILED') {
    return '분석 실패'
  }

  return '분석 미연결'
}

function buildSummaryText(document: DocumentItem) {
  if (document.summary) {
    return document.summary
  }

  if (document.description) {
    return document.description
  }

  return '아직 문서 요약이 없습니다. 이후 datasource/FastAPI 분석 연결 시 이 영역에 요약과 키워드가 표시됩니다.'
}

function buildKeywordList(value: string | null) {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function canInlinePreview(document: DocumentItem) {
  const contentType = previewContentType.value ?? document.contentType ?? ''

  return (
    contentType.startsWith('application/pdf') ||
    contentType.startsWith('image/') ||
    contentType.startsWith('text/')
  )
}

function isImageDocument(document: DocumentItem) {
  const contentType = previewContentType.value ?? document.contentType ?? ''
  return contentType.startsWith('image/')
}

function openPreview() {
  if (!previewObjectUrl.value) {
    return
  }

  window.open(previewObjectUrl.value, '_blank', 'noopener,noreferrer')
}

async function openDownload(document: DocumentItem) {
  try {
    const downloadResult = await documentService.getDocumentDownloadObjectUrl(
      document.id,
    )

    const link = window.document.createElement('a')
    link.href = downloadResult.objectUrl
    link.download = document.originalFileName || document.title || 'document'
    link.click()

    window.setTimeout(() => {
      URL.revokeObjectURL(downloadResult.objectUrl)
    }, 1000)
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error ? error.message : '문서 다운로드에 실패했습니다.'
  }
}

function resetEditDocumentForm() {
  isEditingDocument.value = false
  editTitle.value = ''
  editDocumentType.value = 'REPORT'
  editDescription.value = ''
  editMessage.value = ''
}

function openEditDocumentForm() {
  if (!selectedDocument.value) {
    return
  }

  editTitle.value = selectedDocument.value.title
  editDocumentType.value = selectedDocument.value.documentType || 'REPORT'
  editDescription.value = selectedDocument.value.description || ''
  editMessage.value = ''
  isEditingDocument.value = true
}

function closeEditDocumentForm() {
  if (isUpdatingDocument.value) {
    return
  }

  resetEditDocumentForm()
}

async function updateSelectedDocument() {
  if (!selectedDocument.value) {
    return
  }

  isUpdatingDocument.value = true
  editMessage.value = ''

  try {
    const updatedDocument = await documentService.updateDocument(
      selectedDocument.value.id,
      {
        title: editTitle.value,
        documentType: editDocumentType.value,
        description: editDescription.value,
      },
    )

    selectedDocument.value = updatedDocument
    resetEditDocumentForm()
    await fetchDocuments()
  } catch (error: unknown) {
    editMessage.value =
      error instanceof Error ? error.message : '문서 수정에 실패했습니다.'
  } finally {
    isUpdatingDocument.value = false
  }
}

async function deleteSelectedDocument() {
  if (!selectedDocument.value) {
    return
  }

  const confirmed = window.confirm(
    `"${selectedDocument.value.title}" 문서를 삭제하시겠습니까?`,
  )

  if (!confirmed) {
    return
  }

  try {
    await documentService.deleteDocument(selectedDocument.value.id)

    closeDocumentDetail()
    await fetchDocuments()
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error ? error.message : '문서 삭제에 실패했습니다.'
  }
}

onMounted(() => {
  void fetchDocuments()
})

watch(
  () => workspaceId.value,
  () => {
    selectedDocument.value = null
    clearPreviewObjectUrl()
    resetEditDocumentForm()
    void fetchDocuments()
  },
)
</script>

<template>
  <AppLayout>
    <main class="documents-page-shell">
      <section class="documents-page">
        <header class="documents-hero">
          <div>
            <p class="documents-eyebrow">Documents</p>
            <h1>문서 관리</h1>
            <p class="documents-description">
              워크스페이스의 보고서, 회의록, 지침, 참고자료를 업로드하고
              미리보기·다운로드·AI 분석 연결 상태를 관리합니다.
            </p>
          </div>

          <div class="documents-hero-actions">
            <button
              type="button"
              class="documents-secondary-button"
              @click="goToDashboard"
            >
              대시보드로 이동
            </button>

            <button
              type="button"
              class="documents-primary-button"
              @click="fetchDocuments"
            >
              새로고침
            </button>
          </div>
        </header>

        <section class="documents-toolbar-card">
          <div>
            <p class="documents-eyebrow">Knowledge Documents</p>
            <h2>문서 관리</h2>
            <p>
              프로젝트 지식 문서를 업로드하고, 미리보기·다운로드·수정·삭제할 수
              있습니다.
            </p>
          </div>

          <button
            type="button"
            class="documents-primary-button"
            @click="openUploadModal"
          >
            문서 업로드
          </button>
        </section>

        <section class="documents-summary-grid">
          <article class="documents-summary-card">
            <span>전체 문서</span>
            <strong>{{ totalDocumentCount }}</strong>
          </article>

          <article class="documents-summary-card">
            <span>DOC Source</span>
            <strong>{{ docSourceCount }}</strong>
          </article>

          <article class="documents-summary-card">
            <span>분석 완료</span>
            <strong>{{ analyzedDocumentCount }}</strong>
          </article>

          <article class="documents-summary-card">
            <span>분석 대기</span>
            <strong>{{ pendingDocumentCount }}</strong>
          </article>
        </section>

        <section class="knowledge-hub-tabs-card">
          <div>
            <p class="documents-eyebrow">Knowledge Hub</p>
            <h2>프로젝트 지식 허브</h2>
            <p>
              문서, Git 변경사항, AI 분석 결과를 하나의 흐름으로 확인합니다.
            </p>
          </div>

          <div class="knowledge-hub-tabs">
            <button
              v-for="tab in knowledgeTabs"
              :key="tab.key"
              type="button"
              class="knowledge-hub-tab-button"
              :class="{ active: activeKnowledgeTab === tab.key }"
              @click="changeKnowledgeTab(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
        </section>

        <section
          v-if="activeKnowledgeTab === 'documents'"
          class="documents-content-card"
        >
          <div class="documents-content-header">
            <div>
              <h2>Document 목록</h2>
              <p>
                현재 Workspace 기준으로 조회된 Knowledge Document입니다. 항목을
                클릭하면 파일 정보, 미리보기, 다운로드, 분석 상태를 확인할 수
                있습니다.
              </p>
            </div>

            <span class="documents-count-badge">
              {{ documents.length }}개 표시
            </span>
          </div>

          <div v-if="isLoading" class="documents-state-box">
            문서 목록을 불러오는 중입니다.
          </div>

          <div v-else-if="errorMessage" class="documents-state-box error">
            {{ errorMessage }}
          </div>

          <div v-else-if="documents.length === 0" class="documents-state-box">
            아직 연결된 문서가 없습니다. 상단의 문서 업로드 버튼으로 파일을
            추가할 수 있습니다.
          </div>

          <div v-else class="documents-grid">
            <article
              v-for="document in documents"
              :key="document.id"
              class="document-card"
              role="button"
              tabindex="0"
              @click="openDocumentDetail(document.id)"
              @keydown.enter="openDocumentDetail(document.id)"
            >
              <div class="document-card-header">
                <h3>{{ document.title }}</h3>
                <span class="document-source-badge">
                  {{ getDocumentTypeLabel(document.documentType) }}
                </span>
              </div>

              <p class="document-summary">
                {{ buildSummaryText(document) }}
              </p>

              <dl class="document-meta">
                <div>
                  <span>File</span>
                  <strong>{{ document.originalFileName || '미등록' }}</strong>
                </div>
                <div>
                  <span>Analysis</span>
                  <strong>{{
                    getAnalysisStatusLabel(document.analysisStatus)
                  }}</strong>
                </div>
                <div>
                  <span>Uploader</span>
                  <strong>{{ document.uploadedByName || '미지정' }}</strong>
                </div>
                <div>
                  <span>Created</span>
                  <strong>{{ formatDate(document.createdAt) }}</strong>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <section
          v-else-if="activeKnowledgeTab === 'git'"
          class="documents-content-card"
        >
          <div class="documents-content-header">
            <div>
              <h2>Git Changes</h2>
              <p>
                현재 연결된 로컬 Git 저장소의 최근 commit 변경사항입니다. 이후
                Task와 연결하여 작업별 변경 이력을 추적할 수 있습니다.
              </p>
            </div>

            <button
              type="button"
              class="documents-secondary-button"
              :disabled="isGitLoading"
              @click="fetchGitCommits"
            >
              {{ isGitLoading ? '불러오는 중...' : 'Git 새로고침' }}
            </button>
          </div>

          <div v-if="isGitLoading" class="documents-state-box">
            Git 변경사항을 불러오는 중입니다.
          </div>

          <div v-else-if="gitErrorMessage" class="documents-state-box error">
            {{ gitErrorMessage }}
          </div>

          <div v-else-if="gitCommits.length === 0" class="documents-state-box">
            표시할 Git commit이 없습니다.
          </div>

          <div v-else class="git-commit-list">
            <article
              v-for="commit in gitCommits"
              :key="commit.hash"
              class="git-commit-card"
            >
              <div class="git-commit-main">
                <span class="git-commit-hash">{{ commit.shortHash }}</span>
                <h3>{{ commit.message }}</h3>
                <p>
                  {{ commit.authorName }}
                  <span v-if="commit.authorEmail">
                    · {{ commit.authorEmail }}
                  </span>
                </p>
              </div>

              <div class="git-commit-meta">
                <span>{{ commit.branchName }}</span>
                <strong>{{ commit.committedAt }}</strong>
              </div>
            </article>
          </div>
        </section>

        <section
          v-else-if="activeKnowledgeTab === 'ai'"
          class="documents-content-card"
        >
          <div class="documents-content-header">
            <div>
              <h2>AI Analysis</h2>
              <p>
                문서와 Git 변경사항을 기반으로 프로젝트 지식 요약, 관련 Task
                추천, 변경 리스크 분석을 제공할 예정입니다.
              </p>
            </div>
          </div>

          <div class="ai-analysis-placeholder">
            <p class="documents-eyebrow">Coming Next</p>
            <h3>AI 기반 프로젝트 분석 영역</h3>
            <p>
              이후 FastAPI와 Vector DB가 연결되면 문서 요약, 키워드 추출, 관련
              Task 추천, Git 변경사항 분석 결과가 이 영역에 표시됩니다.
            </p>
          </div>
        </section>
      </section>
    </main>

    <Teleport to="body">
      <div
        v-if="isUploadModalOpen"
        class="document-modal-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="closeUploadModal"
      >
        <section class="document-modal upload-modal">
          <header class="document-modal-header">
            <div>
              <p class="documents-eyebrow">Upload Document</p>
              <h2>문서 업로드</h2>
              <p>파일을 선택하고 문서 유형과 설명을 입력합니다.</p>
            </div>

            <button
              type="button"
              class="document-modal-close"
              aria-label="문서 업로드 닫기"
              @click="closeUploadModal"
            >
              ×
            </button>
          </header>

          <div class="document-modal-body upload-modal-body">
            <label class="documents-field upload-modal-field">
              <span>문서 유형</span>
              <select v-model="selectedDocumentType">
                <option
                  v-for="option in documentTypeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="documents-field upload-modal-field">
              <span>문서 설명 선택 입력</span>
              <textarea
                v-model="uploadDescription"
                rows="4"
                placeholder="예: 프론트엔드 작업 지침, 회의 내용 정리, API 명세 참고자료 등"
              />
            </label>

            <div class="upload-file-box">
              <input
                ref="fileInputRef"
                type="file"
                class="documents-hidden-file"
                @change="handleUploadFileChange"
              />

              <button
                type="button"
                class="documents-secondary-button"
                @click="openFilePicker"
              >
                파일 선택
              </button>

              <p v-if="selectedUploadFile">
                선택된 파일:
                <strong>{{ selectedUploadFile.name }}</strong>
              </p>

              <p v-else>아직 선택된 파일이 없습니다.</p>
            </div>

            <p v-if="uploadMessage" class="documents-upload-message">
              {{ uploadMessage }}
            </p>
          </div>

          <footer class="document-modal-footer">
            <button
              type="button"
              class="documents-ghost-button"
              :disabled="isUploading"
              @click="closeUploadModal"
            >
              취소
            </button>

            <button
              type="button"
              class="documents-primary-button"
              :disabled="isUploading || !selectedUploadFile"
              @click="uploadSelectedDocument"
            >
              {{ isUploading ? '업로드 중...' : '업로드' }}
            </button>
          </footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="selectedDocument"
        class="document-modal-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="closeDocumentDetail"
      >
        <section class="document-modal">
          <header class="document-modal-header">
            <div>
              <p class="documents-eyebrow">Document Detail</p>
              <h2>{{ selectedDocument.title }}</h2>
            </div>

            <button
              type="button"
              class="document-modal-close"
              aria-label="문서 상세 닫기"
              @click="closeDocumentDetail"
            >
              ×
            </button>
          </header>

          <div class="document-modal-body">
            <section
              v-if="isEditingDocument"
              class="document-analysis-card document-edit-card"
            >
              <div class="document-section-heading">
                <div>
                  <h3>Document 수정</h3>
                  <p>문서 제목, 문서 유형, 문서 설명을 수정합니다.</p>
                </div>
              </div>

              <div class="document-edit-form">
                <label class="documents-field">
                  <span>문서 제목</span>
                  <input
                    v-model="editTitle"
                    type="text"
                    placeholder="문서 제목을 입력하세요"
                  />
                </label>

                <label class="documents-field">
                  <span>문서 유형</span>
                  <select v-model="editDocumentType">
                    <option
                      v-for="option in documentTypeOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label class="documents-field document-edit-description">
                  <span>문서 설명</span>
                  <textarea
                    v-model="editDescription"
                    rows="4"
                    placeholder="문서 설명을 입력하세요"
                  />
                </label>
              </div>

              <p v-if="editMessage" class="documents-upload-message">
                {{ editMessage }}
              </p>
            </section>

            <section class="document-analysis-card">
              <div class="document-section-heading">
                <div>
                  <h3>Preview</h3>
                  <p>
                    PDF, 이미지, 텍스트 계열 파일은 브라우저에서 기본 미리보기를
                    제공합니다.
                  </p>
                </div>

                <div class="document-preview-actions">
                  <button
                    type="button"
                    class="documents-secondary-button"
                    :disabled="!previewObjectUrl"
                    @click="openPreview"
                  >
                    새 창 미리보기
                  </button>

                  <button
                    type="button"
                    class="documents-primary-button"
                    :disabled="!selectedDocument.downloadUrl"
                    @click="openDownload(selectedDocument)"
                  >
                    다운로드
                  </button>
                </div>
              </div>

              <div v-if="isPreviewLoading" class="documents-state-box">
                문서 미리보기를 불러오는 중입니다.
              </div>

              <div
                v-else-if="previewErrorMessage"
                class="documents-state-box error"
              >
                {{ previewErrorMessage }}
              </div>

              <div
                v-else-if="
                  previewObjectUrl && canInlinePreview(selectedDocument)
                "
                class="document-preview-frame"
              >
                <img
                  v-if="isImageDocument(selectedDocument)"
                  :src="previewObjectUrl"
                  :alt="
                    selectedDocument.originalFileName || selectedDocument.title
                  "
                />

                <iframe v-else :src="previewObjectUrl" title="문서 미리보기" />
              </div>

              <div v-else class="documents-state-box">
                이 파일 형식은 브라우저 기본 미리보기를 지원하지 않습니다.
                다운로드 버튼으로 확인해 주세요.
              </div>
            </section>

            <section class="document-analysis-card">
              <h3>AI Analysis</h3>
              <p>{{ buildSummaryText(selectedDocument) }}</p>

              <div
                v-if="buildKeywordList(selectedDocument.keywords).length > 0"
                class="document-keyword-list"
              >
                <span
                  v-for="keyword in buildKeywordList(selectedDocument.keywords)"
                  :key="keyword"
                >
                  {{ keyword }}
                </span>
              </div>
            </section>

            <section class="document-detail-grid">
              <article class="document-detail-card">
                <span>Document ID</span>
                <strong>{{ selectedDocument.id }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Document Type</span>
                <strong>{{
                  getDocumentTypeLabel(selectedDocument.documentType)
                }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Description</span>
                <strong>{{ selectedDocument.description || '미입력' }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Original File</span>
                <strong>{{
                  selectedDocument.originalFileName || '미등록'
                }}</strong>
              </article>

              <article class="document-detail-card">
                <span>File Size</span>
                <strong>{{ formatFileSize(selectedDocument.fileSize) }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Content Type</span>
                <strong>{{ selectedDocument.contentType || '미정' }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Uploaded By</span>
                <strong>{{
                  selectedDocument.uploadedByName || '미지정'
                }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Uploader Email</span>
                <strong>{{
                  selectedDocument.uploadedByEmail || '미지정'
                }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Workspace</span>
                <strong>{{ selectedDocument.workspaceName }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Data Source</span>
                <strong>{{ selectedDocument.sourceName }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Source Type</span>
                <strong>{{ selectedDocument.sourceType }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Source Status</span>
                <strong>{{ selectedDocument.sourceStatus }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Analysis Status</span>
                <strong>
                  {{ getAnalysisStatusLabel(selectedDocument.analysisStatus) }}
                </strong>
              </article>

              <article class="document-detail-card">
                <span>Analyzed At</span>
                <strong>{{ formatDate(selectedDocument.analyzedAt) }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Vector ID</span>
                <strong>{{ selectedDocument.vectorId || '미연결' }}</strong>
              </article>

              <article class="document-detail-card">
                <span>Updated</span>
                <strong>{{ formatDate(selectedDocument.updatedAt) }}</strong>
              </article>
            </section>
          </div>

          <footer class="document-modal-footer">
            <div class="document-modal-footer-actions">
              <button
                v-if="!isEditingDocument"
                type="button"
                class="documents-secondary-button"
                @click="openEditDocumentForm"
              >
                문서 수정
              </button>

              <template v-else>
                <button
                  type="button"
                  class="documents-primary-button"
                  :disabled="isUpdatingDocument"
                  @click="updateSelectedDocument"
                >
                  {{ isUpdatingDocument ? '수정 중...' : '수정 저장' }}
                </button>

                <button
                  type="button"
                  class="documents-ghost-button"
                  :disabled="isUpdatingDocument"
                  @click="closeEditDocumentForm"
                >
                  수정 취소
                </button>
              </template>

              <button
                type="button"
                class="documents-danger-button"
                :disabled="isUpdatingDocument"
                @click="deleteSelectedDocument"
              >
                문서 삭제
              </button>
            </div>

            <button
              type="button"
              class="documents-ghost-button"
              @click="closeDocumentDetail"
            >
              닫기
            </button>
          </footer>
        </section>
      </div>
    </Teleport>
  </AppLayout>
</template>
