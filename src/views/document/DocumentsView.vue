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
    <div class="doc-shell">
      <div class="doc">
        <!-- ══ HERO ══ -->
        <header class="doc-hero">
          <div class="doc-hero-left">
            <p class="doc-hero-lbl">Knowledge Documents</p>
            <span class="doc-hero-status">AI 분석 연동</span>
            <h1>
              문서 {{ totalDocumentCount }}건 중 {{ analyzedDocumentCount }}건
              분석 완료
            </h1>
            <p>
              보고서·회의록·지침·참고자료를 업로드하면 미리보기·다운로드와 함께
              AI 분석 연결 상태를 한 곳에서 관리할 수 있습니다.
            </p>
            <div class="doc-hero-actions">
              <button
                type="button"
                class="doc-hero-btn doc-hero-btn-pri"
                @click="openUploadModal"
              >
                문서 업로드
              </button>
              <button
                type="button"
                class="doc-hero-btn doc-hero-btn-sec"
                @click="goToDashboard"
              >
                대시보드로 이동
              </button>
            </div>
          </div>
          <div class="doc-hero-right">
            <p class="doc-hero-r-top">분석 상태</p>
            <div class="doc-hero-r-body">
              <div class="doc-hero-donut">
                <svg viewBox="0 0 100 100">
                  <circle class="doc-donut-track" cx="50" cy="50" r="38" />
                  <circle class="doc-donut-fill" cx="50" cy="50" r="38" :stroke-dasharray="238.76" :stroke-dashoffset="238.76 - (totalDocumentCount > 0 ? (analyzedDocumentCount / totalDocumentCount) * 238.76 : 238.76)" />
                </svg>
                <div class="doc-donut-label">
                  <div class="num">{{ totalDocumentCount > 0 ? Math.round((analyzedDocumentCount / totalDocumentCount) * 100) : 0 }}%</div>
                  <div class="lbl">분석률</div>
                </div>
              </div>
              <div class="doc-hero-lgd">
                <div class="doc-lgd-row"><span class="doc-lgd-dot" style="background:#8B8FF8"></span><span class="lb">완료</span><span class="vl">{{ analyzedDocumentCount }}</span></div>
                <div class="doc-lgd-row"><span class="doc-lgd-dot" style="background:rgba(255,255,255,.15)"></span><span class="lb">실패</span><span class="vl">{{ documents.filter(d => d.analysisStatus === 'FAILED').length }}</span></div>
                <div class="doc-lgd-row"><span class="doc-lgd-dot" style="background:rgba(255,255,255,.08)"></span><span class="lb">대기</span><span class="vl">{{ pendingDocumentCount }}</span></div>
              </div>
            </div>
            <div class="doc-hero-foot">{{ analyzedDocumentCount }} / {{ totalDocumentCount }} 문서 분석 완료</div>
          </div>
        </header>

        <!-- ══ METRICS ══ -->
        <section class="doc-metrics">
          <div class="doc-metric">
            <div class="doc-metric-hd">
              <span class="lb">전체 문서</span
              ><span class="ic"
                ><svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  />
                  <polyline points="14 2 14 8 20 8" /></svg
              ></span>
            </div>
            <div class="doc-metric-val">
              <span class="n">{{ totalDocumentCount }}</span>
            </div>
            <div class="doc-metric-spark">
              <svg viewBox="0 0 200 26">
                <path
                  d="M0 26 Q25 18 50 20 T100 12 T150 16 T200 10 L200 26Z"
                  fill="var(--brand-light)"
                />
                <path
                  d="M0 26 Q25 18 50 20 T100 12 T150 16 T200 10"
                  fill="none"
                  stroke="var(--brand-indigo)"
                  stroke-width="1.5"
                />
              </svg>
            </div>
          </div>
          <div class="doc-metric">
            <div class="doc-metric-hd">
              <span class="lb">DOC Source</span
              ><span class="ic"
                ><svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                  /></svg
              ></span>
            </div>
            <div class="doc-metric-val">
              <span class="n">{{ docSourceCount }}</span>
            </div>
            <div class="doc-metric-spark">
              <svg viewBox="0 0 200 26">
                <path
                  d="M0 26 Q25 20 50 22 T100 16 T150 18 T200 14 L200 26Z"
                  fill="var(--brand-light)"
                />
                <path
                  d="M0 26 Q25 20 50 22 T100 16 T150 18 T200 14"
                  fill="none"
                  stroke="var(--brand-indigo)"
                  stroke-width="1.5"
                />
              </svg>
            </div>
          </div>
          <div class="doc-metric">
            <div class="doc-metric-hd">
              <span class="lb">분석 완료</span
              ><span class="ic"
                ><svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" /></svg
              ></span>
            </div>
            <div class="doc-metric-val">
              <span class="n">{{ analyzedDocumentCount }}</span>
            </div>
            <div class="doc-metric-spark">
              <svg viewBox="0 0 200 26">
                <path
                  d="M0 26 Q25 22 50 20 T100 12 T150 8 T200 6 L200 26Z"
                  fill="var(--brand-light)"
                />
                <path
                  d="M0 26 Q25 22 50 20 T100 12 T150 8 T200 6"
                  fill="none"
                  stroke="var(--brand-indigo)"
                  stroke-width="1.5"
                />
              </svg>
            </div>
          </div>
          <div class="doc-metric">
            <div class="doc-metric-hd">
              <span class="lb">분석 대기</span
              ><span class="ic"
                ><svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" /></svg
              ></span>
            </div>
            <div class="doc-metric-val">
              <span class="n">{{ pendingDocumentCount }}</span>
            </div>
            <div class="doc-metric-spark">
              <svg viewBox="0 0 200 26">
                <path
                  d="M0 26 Q25 24 50 22 T100 24 T150 20 T200 18 L200 26Z"
                  fill="var(--page-bg)"
                />
                <path
                  d="M0 26 Q25 24 50 22 T100 24 T150 20 T200 18"
                  fill="none"
                  stroke="var(--text-light)"
                  stroke-width="1.5"
                />
              </svg>
            </div>
          </div>
          <div class="doc-metric">
            <div class="doc-metric-hd">
              <span class="lb">분석 실패</span
              ><span class="ic"
                ><svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                  />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" /></svg
              ></span>
            </div>
            <div class="doc-metric-val">
              <span class="n">{{
                documents.filter((d) => d.analysisStatus === 'FAILED').length
              }}</span>
            </div>
            <div class="doc-metric-spark">
              <svg viewBox="0 0 200 26">
                <path
                  d="M0 26 Q25 24 50 26 T100 22 T150 24 T200 22 L200 26Z"
                  fill="var(--danger-bg)"
                />
                <path
                  d="M0 26 Q25 24 50 26 T100 22 T150 24 T200 22"
                  fill="none"
                  stroke="var(--danger-text)"
                  stroke-width="1.5"
                />
              </svg>
            </div>
          </div>
        </section>

        <!-- ══ KNOWLEDGE HUB ══ -->
        <section class="doc-tab-card">
          <div class="doc-tab-hd">
            <div>
              <h2>프로젝트 지식 허브</h2>
              <p>
                문서, Git 변경사항, AI 분석 결과를 하나의 흐름으로 확인합니다.
              </p>
            </div>
            <div class="doc-tab-hd-right">
              <div class="doc-tab-filter">
                <button
                  v-for="tab in knowledgeTabs"
                  :key="tab.key"
                  type="button"
                  :class="{ on: activeKnowledgeTab === tab.key }"
                  @click="changeKnowledgeTab(tab.key)"
                >
                  {{ tab.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Documents Tab -->
          <div v-if="activeKnowledgeTab === 'documents'">
            <div v-if="isLoading" class="doc-state">
              문서 목록을 불러오는 중입니다.
            </div>
            <div v-else-if="errorMessage" class="doc-state error">
              {{ errorMessage }}
            </div>
            <div v-else-if="documents.length === 0" class="doc-state">
              등록된 문서가 없습니다. 문서를 업로드하면 AI 분석과 지식 검색에
              활용됩니다.
            </div>
            <div v-else class="doc-grid">
              <article
                v-for="d in documents"
                :key="d.id"
                class="doc-item"
                @click="openDocumentDetail(d.id)"
              >
                <div class="doc-item-hd">
                  <h3>{{ d.title }}</h3>
                  <span
                    class="doc-tag"
                    :class="(d.documentType || 'x').toLowerCase().slice(0, 4)"
                    >{{ getDocumentTypeLabel(d.documentType) }}</span
                  >
                </div>
                <p class="doc-summary">
                  {{ buildSummaryText(d).slice(0, 120)
                  }}{{ buildSummaryText(d).length > 120 ? '...' : '' }}
                </p>
                <div class="doc-item-meta">
                  <div>
                    <span class="lbl">File</span
                    ><span class="val">{{
                      d.originalFileName || '미등록'
                    }}</span>
                  </div>
                  <div>
                    <span class="lbl">Uploader</span
                    ><span class="val">{{ d.uploadedByName || '미지정' }}</span>
                  </div>
                  <div>
                    <span class="lbl">Created</span
                    ><span class="val">{{ formatDate(d.createdAt) }}</span>
                  </div>
                  <div>
                    <span class="lbl">Analysis</span
                    ><span
                      class="val"
                      :style="
                        'color:' +
                        (d.analysisStatus === 'COMPLETED'
                          ? '#15803d'
                          : d.analysisStatus === 'FAILED'
                            ? 'var(--danger-text)'
                            : 'var(--text-light)')
                      "
                      >{{ getAnalysisStatusLabel(d.analysisStatus) }}</span
                    >
                  </div>
                </div>
              </article>
            </div>
          </div>

          <!-- Git Tab -->
          <div v-else-if="activeKnowledgeTab === 'git'">
            <div class="doc-tab-hd" style="border-bottom: 0; padding-bottom: 0">
              <p>현재 연결된 Git 저장소의 최근 commit 변경사항입니다.</p>
              <button
                type="button"
                class="doc-hero-btn doc-hero-btn-sec"
                style="
                  color: var(--text-body);
                  border-color: var(--card-border);
                "
                :disabled="isGitLoading"
                @click="fetchGitCommits"
              >
                {{ isGitLoading ? '불러오는 중...' : 'Git 새로고침' }}
              </button>
            </div>
            <div v-if="isGitLoading" class="doc-state">
              Git 변경사항을 불러오는 중입니다.
            </div>
            <div v-else-if="gitErrorMessage" class="doc-state error">
              {{ gitErrorMessage }}
            </div>
            <div v-else-if="gitCommits.length === 0" class="doc-state">
              표시할 Git commit이 없습니다.
            </div>
            <div v-else class="doc-git-list">
              <div v-for="c in gitCommits" :key="c.hash" class="doc-git-row">
                <span class="doc-git-ico"
                  ><svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <line x1="1.05" y1="12" x2="7" y2="12" />
                    <line x1="17.01" y1="12" x2="22.96" y2="12" /></svg
                ></span>
                <div class="doc-git-body">
                  <strong>{{ c.message }}</strong>
                  <div class="doc-git-meta">
                    <span class="doc-git-hash">{{ c.shortHash }}</span>
                    <span
                      >{{ c.authorName
                      }}{{ c.authorEmail ? ' · ' + c.authorEmail : '' }}</span
                    >
                    <span>· {{ c.branchName }}</span>
                    <span>· {{ c.committedAt }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Tab -->
          <div v-else-if="activeKnowledgeTab === 'ai'" style="padding:18px 20px;display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <div>
                <h3 style="margin:0;font-size:15px;font-weight:700;color:var(--text-body)">AI 분석 현황</h3>
                <p style="margin:4px 0 0;font-size:12px;color:var(--text-secondary)">문서 분석 결과 요약 · 키워드 · 리스크 평가</p>
              </div>
              <span style="padding:4px 12px;border-radius:999px;background:var(--brand-light);color:var(--brand-indigo);font-family:var(--font-mono);font-size:10px;font-weight:600;white-space:nowrap">총 {{ analyzedDocumentCount }}건 분석 완료</span>
            </div>

            <!-- Status summary chips -->
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:999px;background:#dcfce7;color:#15803d;font-family:var(--font-mono);font-size:10px;font-weight:600">완료 {{ analyzedDocumentCount }}</span>
              <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:999px;background:var(--danger-bg);color:var(--danger-text);font-family:var(--font-mono);font-size:10px;font-weight:600">실패 {{ documents.filter(d=>d.analysisStatus==='FAILED').length }}</span>
              <span style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:999px;background:#f1f3f5;color:#868e96;font-family:var(--font-mono);font-size:10px;font-weight:600">대기 {{ pendingDocumentCount }}</span>
            </div>

            <!-- Analysis results grid -->
            <div v-if="documents.filter(d=>d.analysisStatus==='COMPLETED'||d.summary).length === 0" class="doc-state" style="padding:32px">
              <strong style="display:block;color:var(--text-body)">아직 분석 결과가 없습니다</strong>
              <p style="margin:4px 0 0;font-size:12px;color:var(--text-secondary)">문서를 업로드하고 AI 분석이 완료되면 여기에 결과가 표시됩니다.</p>
            </div>
            <div v-else style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
              <div v-for="d in documents.filter(doc=>doc.analysisStatus==='COMPLETED'||doc.summary)" :key="d.id" style="padding:16px;border-radius:12px;border:1px solid var(--card-border);background:var(--card-bg);display:flex;flex-direction:column;gap:10px">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                  <strong style="font-size:13px;font-weight:600;color:var(--text-body)">{{ d.title }}</strong>
                  <span v-if="d.riskLevel" style="padding:2px 8px;border-radius:999px;font-family:var(--font-mono);font-size:9px;font-weight:700;white-space:nowrap;flex-shrink:0"
                    :style="d.riskLevel==='HIGH'?'background:var(--danger-bg);color:var(--danger-text)':d.riskLevel==='MEDIUM'?'background:#fff9db;color:#e67700':'background:#dcfce7;color:#15803d'">
                    {{ d.riskLevel === 'HIGH' ? '위험' : d.riskLevel === 'MEDIUM' ? '보통' : '낮음' }}
                  </span>
                </div>
                <p v-if="d.summary" style="margin:0;font-size:12px;color:var(--text-secondary);line-height:1.6">{{ d.summary.slice(0,200) }}{{ d.summary.length > 200 ? '...' : '' }}</p>
                <div v-if="d.keywords" style="display:flex;flex-wrap:wrap;gap:4px">
                  <span v-for="kw in d.keywords.split(',').map(k=>k.trim()).filter(Boolean).slice(0,5)" :key="kw" style="padding:2px 8px;border-radius:999px;background:var(--brand-light);color:var(--brand-chip-text);font-family:var(--font-mono);font-size:9px;font-weight:600">{{ kw }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Upload Modal -->
    <Teleport to="body">
      <div
        v-if="isUploadModalOpen"
        class="doc-overlay"
        @click.self="closeUploadModal"
      >
        <section class="doc-modal">
          <header class="doc-modal-hd">
            <h2>문서 업로드</h2>
            <button
              type="button"
              class="doc-modal-close"
              @click="closeUploadModal"
            >
              &times;
            </button>
          </header>
          <div class="doc-modal-body">
            <div class="doc-field">
              <label>문서 유형</label>
              <select v-model="selectedDocumentType">
                <option
                  v-for="o in documentTypeOptions"
                  :key="o.value"
                  :value="o.value"
                >
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="doc-field">
              <label>문서 설명 (선택)</label>
              <textarea
                v-model="uploadDescription"
                rows="3"
                placeholder="예: 프론트엔드 작업 지침, 회의 내용 정리, API 명세 참고자료 등"
              />
            </div>
            <div class="doc-upload-zone">
              <input
                ref="fileInputRef"
                type="file"
                class="doc-hidden-file"
                style="display: none"
                @change="handleUploadFileChange"
              />
              <button
                type="button"
                class="doc-hero-btn doc-hero-btn-sec"
                style="
                  color: var(--text-body);
                  border-color: var(--card-border);
                  background: var(--card-bg);
                "
                @click="openFilePicker"
              >
                파일 선택
              </button>
              <p>
                <strong>{{
                  selectedUploadFile?.name || '아직 선택된 파일이 없습니다.'
                }}</strong>
              </p>
            </div>
            <div v-if="uploadMessage" class="doc-msg info">
              {{ uploadMessage }}
            </div>
          </div>
          <footer class="doc-modal-ft">
            <button
              type="button"
              class="doc-hero-btn doc-hero-btn-sec"
              style="color: var(--text-body); border-color: var(--card-border)"
              :disabled="isUploading"
              @click="closeUploadModal"
            >
              취소
            </button>
            <button
              type="button"
              class="doc-hero-btn doc-hero-btn-pri"
              :disabled="isUploading || !selectedUploadFile"
              @click="uploadSelectedDocument"
              style="background: var(--brand-indigo); color: #fff"
            >
              {{ isUploading ? '업로드 중...' : '업로드' }}
            </button>
          </footer>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="selectedDocument" class="doc-overlay" @click.self="closeDocumentDetail">
        <section class="doc-modal">
          <header class="doc-modal-hd">
            <div><h2>{{ selectedDocument.title }}</h2></div>
            <button type="button" class="doc-modal-close" @click="closeDocumentDetail">&times;</button>
          </header>

          <div style="padding:20px 24px;display:grid;gap:14px;overflow-y:auto">

            <!-- Edit Section -->
            <section v-if="isEditingDocument" class="doc-analysis-card" style="border-color:var(--card-border)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:12px">
                <div><h3 style="margin:0;font-size:15px;font-weight:700;color:var(--text-body)">Document 수정</h3><p style="margin:4px 0 0;font-size:12px;color:var(--text-secondary)">문서 제목, 문서 유형, 문서 설명을 수정합니다.</p></div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="doc-field"><label>문서 제목</label><input v-model="editTitle" type="text" placeholder="문서 제목을 입력하세요" /></div>
                <div class="doc-field"><label>문서 유형</label>
                  <select v-model="editDocumentType">
                    <option v-for="o in documentTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
                <div class="doc-field" style="grid-column:1/-1"><label>문서 설명</label><textarea v-model="editDescription" rows="3" placeholder="문서 설명을 입력하세요" /></div>
              </div>
              <div v-if="editMessage" class="doc-msg info" style="margin-top:8px">{{ editMessage }}</div>
            </section>

            <!-- Preview -->
            <section class="doc-analysis-card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:12px">
                <div><h3 style="margin:0;font-size:15px;font-weight:700;color:var(--text-body)">Preview</h3><p style="margin:4px 0 0;font-size:12px;color:var(--text-secondary)">PDF, 이미지, 텍스트 계열 파일은 브라우저에서 기본 미리보기를 제공합니다.</p></div>
                <div style="display:flex;gap:8px;flex-shrink:0">
                  <button type="button" class="doc-hero-btn doc-hero-btn-sec" style="color:var(--text-body);border-color:var(--card-border);height:36px;padding:0 12px;font-size:12px" :disabled="!previewObjectUrl" @click="openPreview">새 창 미리보기</button>
                  <button type="button" class="doc-hero-btn doc-hero-btn-pri" style="height:36px;padding:0 12px;font-size:12px" :disabled="!selectedDocument.downloadUrl" @click="openDownload(selectedDocument)">다운로드</button>
                </div>
              </div>
              <div v-if="isPreviewLoading" class="doc-state" style="padding:24px">문서 미리보기를 불러오는 중입니다.</div>
              <div v-else-if="previewErrorMessage" class="doc-state error" style="padding:24px">{{ previewErrorMessage }}</div>
              <div v-else-if="previewObjectUrl && canInlinePreview(selectedDocument)" style="overflow:hidden;min-height:300px;border:1px solid var(--card-border);border-radius:12px;background:var(--page-bg)">
                <img v-if="isImageDocument(selectedDocument)" :src="previewObjectUrl" :alt="selectedDocument.originalFileName || selectedDocument.title" style="display:block;max-width:100%;max-height:480px;margin:0 auto;object-fit:contain" />
                <iframe v-else :src="previewObjectUrl" title="문서 미리보기" style="width:100%;height:420px;border:0;background:var(--card-bg)" />
              </div>
              <div v-else class="doc-state" style="padding:24px">이 파일 형식은 브라우저 기본 미리보기를 지원하지 않습니다. 다운로드 버튼으로 확인해 주세요.</div>
            </section>

            <!-- AI Analysis -->
            <section class="doc-analysis-card">
              <h3 style="margin:0;font-size:15px;font-weight:700;color:var(--text-body)">AI Analysis</h3>
              <p style="margin:8px 0 0;font-size:13px;color:var(--text-secondary);line-height:1.6">{{ buildSummaryText(selectedDocument) }}</p>
              <div v-if="buildKeywordList(selectedDocument.keywords).length > 0" class="doc-keywords" style="margin-top:10px">
                <span v-for="kw in buildKeywordList(selectedDocument.keywords)" :key="kw">{{ kw }}</span>
              </div>
            </section>

            <!-- Detail Grid -->
            <section style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <article v-for="item in [
                {l:'Document ID',v:selectedDocument.id},
                {l:'Document Type',v:getDocumentTypeLabel(selectedDocument.documentType)},
                {l:'Description',v:selectedDocument.description||'미입력'},
                {l:'Original File',v:selectedDocument.originalFileName||'미등록'},
                {l:'File Size',v:formatFileSize(selectedDocument.fileSize)},
                {l:'Content Type',v:selectedDocument.contentType||'미정'},
                {l:'Uploaded By',v:selectedDocument.uploadedByName||'미지정'},
                {l:'Uploader Email',v:selectedDocument.uploadedByEmail||'미지정'},
                {l:'Workspace',v:selectedDocument.workspaceName},
                {l:'Data Source',v:selectedDocument.sourceName},
                {l:'Source Type',v:selectedDocument.sourceType},
                {l:'Source Status',v:selectedDocument.sourceStatus},
                {l:'Analysis Status',v:getAnalysisStatusLabel(selectedDocument.analysisStatus)},
                {l:'Analyzed At',v:formatDate(selectedDocument.analyzedAt)},
                {l:'Vector ID',v:selectedDocument.vectorId||'미연결'},
                {l:'Updated',v:formatDate(selectedDocument.updatedAt)},
              ]" :key="item.l" class="doc-detail-item">
                <div class="lbl">{{ item.l }}</div>
                <div class="val">{{ item.v }}</div>
              </article>
            </section>
          </div>

          <footer style="display:flex;justify-content:space-between;padding:16px 24px;border-top:1px solid var(--card-border)">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button v-if="!isEditingDocument" type="button" class="doc-hero-btn doc-hero-btn-sec" style="color:var(--text-body);border-color:var(--card-border);height:38px;font-size:12px" @click="openEditDocumentForm">문서 수정</button>
              <template v-else>
                <button type="button" class="doc-hero-btn doc-hero-btn-pri" style="height:38px;font-size:12px" :disabled="isUpdatingDocument" @click="updateSelectedDocument">{{ isUpdatingDocument?'수정 중...':'수정 저장' }}</button>
                <button type="button" class="doc-hero-btn doc-hero-btn-sec" style="color:var(--text-body);border-color:var(--card-border);height:38px;font-size:12px" :disabled="isUpdatingDocument" @click="closeEditDocumentForm">수정 취소</button>
              </template>
              <button type="button" style="height:38px;padding:0 14px;border-radius:8px;border:0;background:var(--danger-bg);color:var(--danger-text);font-family:var(--font-ui);font-size:12px;font-weight:600;cursor:pointer" :disabled="isUpdatingDocument" @click="deleteSelectedDocument">문서 삭제</button>
            </div>
            <button type="button" class="doc-hero-btn doc-hero-btn-sec" style="color:var(--text-body);border-color:var(--card-border);height:38px;font-size:12px" @click="closeDocumentDetail">닫기</button>
          </footer>
        </section>
      </div>
    </Teleport>
  </AppLayout>
</template>
