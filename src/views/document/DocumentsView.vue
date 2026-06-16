<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { documentService } from '@/services/documentService'
import type { DocumentItem } from '@/api/documentApi'
import '@/assets/styles/documents.css'

const route = useRoute()
const router = useRouter()

const documents = ref<DocumentItem[]>([])
const selectedDocument = ref<DocumentItem | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')

const workspaceId = computed(() => {
  const value = route.params.workspaceId
  return Array.isArray(value) ? value[0] : value
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

async function openDocumentDetail(documentId: string) {
  try {
    selectedDocument.value = await documentService.getDocumentDetail(documentId)
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : '문서 상세 정보를 불러오지 못했습니다.'
  }
}

function closeDocumentDetail() {
  selectedDocument.value = null
}

function goToDashboard() {
  if (!workspaceId.value) {
    return
  }

  router.push(`/workspaces/${workspaceId.value}/dashboard`)
}

function formatDate(value: string | null) {
  if (!value) {
    return '미정'
  }

  return value.replace('T', ' ').slice(0, 16)
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

  return '아직 문서 요약이 없습니다. Day 3에서 AI Engine 문서 분석을 연결하면 이 영역에 요약과 키워드가 표시됩니다.'
}

onMounted(() => {
  void fetchDocuments()
})

watch(
  () => workspaceId.value,
  () => {
    selectedDocument.value = null
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
              워크스페이스에 연결된 지식 문서를 확인합니다. 문서는 Task,
              Dashboard, AI 분석의 공통 데이터로 사용되며, 이후
              업로드·요약·키워드 분석 기능과 연결됩니다.
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

        <section class="documents-content-card">
          <div class="documents-content-header">
            <div>
              <h2>Document 목록</h2>
              <p>
                현재 Workspace 기준으로 조회된 Knowledge Document입니다. 항목을
                클릭하면 상세 정보와 분석 연결 상태를 확인할 수 있습니다.
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
            아직 연결된 문서가 없습니다. 이후 파일 업로드 또는 데이터 소스
            연결을 통해 문서를 추가할 수 있습니다.
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
                  {{ document.sourceType }}
                </span>
              </div>

              <p class="document-summary">
                {{ buildSummaryText(document) }}
              </p>

              <dl class="document-meta">
                <div>
                  <span>Source</span>
                  <strong>{{ document.sourceName }}</strong>
                </div>
                <div>
                  <span>Analysis</span>
                  <strong>{{
                    getAnalysisStatusLabel(document.analysisStatus)
                  }}</strong>
                </div>
                <div>
                  <span>Vector ID</span>
                  <strong>{{ document.vectorId || '미연결' }}</strong>
                </div>
                <div>
                  <span>Created</span>
                  <strong>{{ formatDate(document.createdAt) }}</strong>
                </div>
              </dl>
            </article>
          </div>
        </section>
      </section>
    </main>

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
            <section class="document-analysis-card">
              <h3>AI Analysis</h3>
              <p>{{ buildSummaryText(selectedDocument) }}</p>
            </section>

            <section class="document-detail-grid">
              <article class="document-detail-card">
                <span>Document ID</span>
                <strong>{{ selectedDocument.id }}</strong>
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
