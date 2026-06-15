import axiosClient from './axiosClient'

// ─── Request / Response 타입 정의 (Co-location) ───────────────────────────

export interface PresignedUrlRequest {
  fileName: string
  contentType: string
}

export interface PresignedUrlResponse {
  uploadUrl: string
  fileKey: string
  fileUrl: string
}

// ─── API 객체 (Layer 1: Axios 통신 규격만 정의) ────────────────────────────

export const documentApi = {
  /**
   * 파일명과 콘텐츠 타입을 전달해 업로드용 Presigned URL과 파일 키, 조회 URL을 발급받습니다.
   */
  getPresignedUrl(payload: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    return axiosClient
      .post<PresignedUrlResponse>('/api/documents/presigned-url', payload)
      .then((res) => res.data)
  },

  /**
   * Presigned URL로 파일 원본을 업로드합니다.
   */
  uploadFile(uploadUrl: string, file: File): Promise<void> {
    return axiosClient
      .put<void>(uploadUrl, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      })
      .then(() => undefined)
  },
}
