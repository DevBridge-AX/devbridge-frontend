import axiosClient from './axiosClient'

export interface ConnectDataSourceRequest {
  workspaceId: string
  sourceType: string
  sourceName: string
}

export interface DataSourceItem {
  id: string
  workspaceId: string
  sourceType: string
  sourceName: string
  status: string
}

export const dataSourceApi = {
  connectDataSource(
    request: ConnectDataSourceRequest,
  ): Promise<DataSourceItem> {
    return axiosClient
      .post<DataSourceItem>('/api/datasources', request)
      .then((res) => res.data)
  },

  fetchDataSource(dataSourceId: string): Promise<DataSourceItem> {
    return axiosClient
      .get<DataSourceItem>(`/api/datasources/${dataSourceId}`)
      .then((res) => res.data)
  },
}
