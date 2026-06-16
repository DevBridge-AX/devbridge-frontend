import axiosClient from './axiosClient'

export interface GitCommitItem {
  hash: string
  shortHash: string
  authorName: string
  authorEmail: string
  committedAt: string
  message: string
  branchName: string
}

export const gitApi = {
  fetchRecentCommits(limit = 20): Promise<GitCommitItem[]> {
    return axiosClient
      .get<GitCommitItem[]>('/api/git/commits', {
        params: { limit },
      })
      .then((res) => res.data)
  },
}
