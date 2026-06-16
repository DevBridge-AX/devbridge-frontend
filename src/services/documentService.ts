import axios from 'axios'
import { documentApi } from '@/api/documentApi'
import type { DocumentItem } from '@/api/documentApi'

export interface UploadDocumentResult {
  fileUrl: string
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

async function uploadDocument(file: File): Promise<UploadDocumentResult> {
  if (!file) {
    throw new Error('업로드할 파일이 없습니다.')
  }

  return {
    fileUrl: URL.createObjectURL(file),
  }
}

export const documentService = {
  getDocumentsByWorkspace,
  getDocumentDetail,
  uploadDocument,
}
