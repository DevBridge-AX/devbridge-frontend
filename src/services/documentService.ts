import { documentApi } from '@/api/documentApi'
import axios from 'axios'

// ─── Layer 3: 비즈니스 로직 (Service) ─────────────────────────────────────
// Presigned URL 발급과 파일 업로드를 묶어 호출부가 2단계 흐름을 신경 쓰지 않도록 추상화합니다.

export interface UploadedDocument {
  fileKey: string
  fileUrl: string
}

/**
 * 파일에 대한 Presigned URL을 발급받고 동일 파일을 업로드합니다.
 * @throws Error - 호출부에서 catch하여 사용자에게 표시할 메시지
 */
async function uploadDocument(file: File): Promise<UploadedDocument> {
  try {
    const { uploadUrl, fileKey, fileUrl } = await documentApi.getPresignedUrl({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
    })

    await documentApi.uploadFile(uploadUrl, file)

    return { fileKey, fileUrl }
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.')
    }

    throw new Error('파일 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

export const documentService = {
  uploadDocument,
}
