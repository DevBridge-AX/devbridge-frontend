import axios from 'axios'
import { documentApi } from '@/api/documentApi'
import type { DocumentItem, UpdateDocumentRequest } from '@/api/documentApi'
import { dataSourceApi } from '@/api/dataSourceApi'

export interface UploadDocumentResult {
  fileUrl: string
}

export interface UploadWorkspaceDocumentRequest {
  workspaceId: string
  uploadedById?: string | null
  taskId?: string | null
  documentType?: string | null
  description?: string | null
  file: File
}

export interface DocumentBlobUrlResult {
  objectUrl: string
  contentType: string | null
}

async function getDocumentsByWorkspace(
  workspaceId: string,
): Promise<DocumentItem[]> {
  if (!workspaceId) {
    throw new Error('워크스페이스 정보가 없습니다.')
  }

  try {
    return await documentApi.fetchDocumentsByWorkspace(workspaceId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('문서 목록을 조회할 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('해당 워크스페이스의 문서 목록을 찾을 수 없습니다.')
      }
    }

    throw new Error('문서 목록을 불러오지 못했습니다.')
  }
}

async function getDocumentDetail(documentId: string): Promise<DocumentItem> {
  if (!documentId) {
    throw new Error('문서 정보가 없습니다.')
  }

  try {
    return await documentApi.fetchDocumentDetail(documentId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('문서 상세 정보를 조회할 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('해당 문서를 찾을 수 없습니다.')
      }
    }

    throw new Error('문서 상세 정보를 불러오지 못했습니다.')
  }
}

/**
 * 기존 Schedule 모달 호환용 함수.
 * 다른 팀원 Schedule 파트에서 documentService.uploadDocument(file)을 사용 중이므로 제거하면 안 됨.
 */
async function uploadDocument(file: File): Promise<UploadDocumentResult> {
  if (!file) {
    throw new Error('업로드할 파일이 없습니다.')
  }

  return {
    fileUrl: URL.createObjectURL(file),
  }
}

/**
 * Documents 페이지와 Task 상세 Documents 탭에서 사용하는 실제 문서 업로드 함수.
 * 1. DOC DataSource 생성
 * 2. 생성된 dataSourceId로 실제 파일 업로드
 * 3. taskId가 있으면 해당 Task에 문서 연결
 */
async function uploadWorkspaceDocument(
  request: UploadWorkspaceDocumentRequest,
): Promise<DocumentItem> {
  if (!request.workspaceId) {
    throw new Error('워크스페이스 정보가 없습니다.')
  }

  if (!request.file) {
    throw new Error('업로드할 파일이 없습니다.')
  }

  try {
    const dataSource = await dataSourceApi.connectDataSource({
      workspaceId: request.workspaceId,
      sourceType: 'DOC',
      sourceName: 'Uploaded Documents',
    })

    return await documentApi.uploadDocument({
      workspaceId: request.workspaceId,
      dataSourceId: dataSource.id,
      uploadedById: request.uploadedById,
      taskId: request.taskId,
      documentType: request.documentType,
      description: request.description,
      file: request.file,
    })
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('문서 업로드 권한이 없습니다.')
      }

      if (status === 413) {
        throw new Error('업로드 파일 크기가 너무 큽니다.')
      }

      if (status === 404) {
        throw new Error(
          '문서 업로드에 필요한 워크스페이스, Task 또는 데이터소스를 찾을 수 없습니다.',
        )
      }
    }

    throw new Error('문서 업로드에 실패했습니다.')
  }
}

async function getDocumentPreviewObjectUrl(
  documentId: string,
): Promise<DocumentBlobUrlResult> {
  if (!documentId) {
    throw new Error('문서 정보가 없습니다.')
  }

  try {
    const blob = await documentApi.fetchDocumentPreviewBlob(documentId)

    return {
      objectUrl: URL.createObjectURL(blob),
      contentType: blob.type || null,
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new Error('문서 미리보기 권한이 없습니다.')
    }

    throw new Error('문서 미리보기를 불러오지 못했습니다.')
  }
}

async function getDocumentDownloadObjectUrl(
  documentId: string,
): Promise<DocumentBlobUrlResult> {
  if (!documentId) {
    throw new Error('문서 정보가 없습니다.')
  }

  try {
    const blob = await documentApi.fetchDocumentDownloadBlob(documentId)

    return {
      objectUrl: URL.createObjectURL(blob),
      contentType: blob.type || null,
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new Error('문서 다운로드 권한이 없습니다.')
    }

    throw new Error('문서 다운로드 파일을 불러오지 못했습니다.')
  }
}

async function updateDocument(
  documentId: string,
  request: UpdateDocumentRequest,
): Promise<DocumentItem> {
  if (!documentId) {
    throw new Error('문서 정보가 없습니다.')
  }

  if (!request.title || !request.title.trim()) {
    throw new Error('문서 제목을 입력해야 합니다.')
  }

  if (!request.documentType || !request.documentType.trim()) {
    throw new Error('문서 유형을 선택해야 합니다.')
  }

  try {
    return await documentApi.updateDocument(documentId, {
      title: request.title.trim(),
      documentType: request.documentType.trim(),
      description: request.description?.trim() ?? '',
    })
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('문서 수정 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('수정할 문서를 찾을 수 없습니다.')
      }
    }

    throw new Error('문서 수정에 실패했습니다.')
  }
}

async function deleteDocument(documentId: string): Promise<void> {
  if (!documentId) {
    throw new Error('문서 정보가 없습니다.')
  }

  try {
    await documentApi.deleteDocument(documentId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('문서 삭제 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('삭제할 문서를 찾을 수 없습니다.')
      }
    }

    throw new Error('문서 삭제에 실패했습니다.')
  }
}

async function analyzeDocument(documentId: string): Promise<DocumentItem> {
  if (!documentId) {
    throw new Error('문서 정보가 없습니다.')
  }

  try {
    return await documentApi.analyzeDocument(documentId)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('문서 AI 분석 권한이 없습니다.')
      }

      if (status === 404) {
        throw new Error('분석할 문서를 찾을 수 없습니다.')
      }

      if (status === 500) {
        throw new Error('AI Engine 분석 중 서버 오류가 발생했습니다.')
      }
    }

    throw new Error('문서 AI 분석에 실패했습니다.')
  }
}

export const documentService = {
  getDocumentsByWorkspace,
  getDocumentDetail,
  uploadDocument,
  uploadWorkspaceDocument,
  getDocumentPreviewObjectUrl,
  getDocumentDownloadObjectUrl,
  updateDocument,
  analyzeDocument,
  deleteDocument,
}
