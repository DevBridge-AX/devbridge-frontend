import axiosClient from './axiosClient'

export interface DocumentItem {
  id: string

  workspaceId: string
  workspaceName: string

  dataSourceId: string
  sourceName: string
  sourceType: string
  sourceStatus: string

  title: string
  documentType: string | null
  description: string | null

  vectorId: string | null

  summary: string | null
  keywords: string | null
  analysisStatus: string | null
  analyzedAt: string | null

  originalFileName: string | null
  storedFileName: string | null
  fileUrl: string | null
  previewUrl: string | null
  downloadUrl: string | null
  contentType: string | null
  fileSize: number | null

  uploadedById: string | null
  uploadedByName: string | null
  uploadedByEmail: string | null

  createdAt: string | null
  updatedAt: string | null
}

export interface UploadDocumentRequest {
  workspaceId: string
  dataSourceId: string
  uploadedById?: string | null
  documentType?: string | null
  description?: string | null
  file: File
}

export interface UpdateDocumentRequest {
  title: string
  documentType: string
  description: string
}

export const documentApi = {
  fetchDocumentsByWorkspace(workspaceId: string): Promise<DocumentItem[]> {
    return axiosClient
      .get<DocumentItem[]>('/api/documents', {
        params: { workspaceId },
      })
      .then((res) => res.data)
  },

  fetchDocumentDetail(documentId: string): Promise<DocumentItem> {
    return axiosClient
      .get<DocumentItem>(`/api/documents/${documentId}`)
      .then((res) => res.data)
  },

  updateDocument(
    documentId: string,
    request: UpdateDocumentRequest,
  ): Promise<DocumentItem> {
    return axiosClient
      .put<DocumentItem>(`/api/documents/${documentId}`, request)
      .then((res) => res.data)
  },

  uploadDocument(request: UploadDocumentRequest): Promise<DocumentItem> {
    const formData = new FormData()

    formData.append('workspaceId', request.workspaceId)
    formData.append('dataSourceId', request.dataSourceId)
    formData.append('file', request.file)

    if (request.uploadedById) {
      formData.append('uploadedById', request.uploadedById)
    }

    if (request.documentType) {
      formData.append('documentType', request.documentType)
    }

    if (request.description) {
      formData.append('description', request.description)
    }

    return axiosClient
      .post<DocumentItem>('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((res) => res.data)
  },

  fetchDocumentPreviewBlob(documentId: string): Promise<Blob> {
    return axiosClient
      .get<Blob>(`/api/documents/${documentId}/preview`, {
        responseType: 'blob',
      })
      .then((res) => res.data)
  },

  fetchDocumentDownloadBlob(documentId: string): Promise<Blob> {
    return axiosClient
      .get<Blob>(`/api/documents/${documentId}/download`, {
        responseType: 'blob',
      })
      .then((res) => res.data)
  },

  deleteDocument(documentId: string): Promise<void> {
    return axiosClient
      .delete<void>(`/api/documents/${documentId}`)
      .then((res) => res.data)
  },
}
