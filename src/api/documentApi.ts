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
  vectorId: string | null

  summary: string | null
  analysisStatus: string | null

  createdAt: string | null
  updatedAt: string | null
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
}
