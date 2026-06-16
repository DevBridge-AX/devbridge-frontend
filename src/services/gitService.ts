import axios from 'axios'
import { gitApi } from '@/api/gitApi'
import type { GitCommitItem } from '@/api/gitApi'

async function getRecentCommits(limit = 20): Promise<GitCommitItem[]> {
  try {
    return await gitApi.fetchRecentCommits(limit)
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        throw new Error('로그인이 필요하거나 세션이 만료되었습니다.')
      }

      if (status === 403) {
        throw new Error('Git 변경사항을 조회할 권한이 없습니다.')
      }

      if (status === 500) {
        throw new Error(
          'Git 저장소 정보를 읽지 못했습니다. 백엔드의 repository path 설정을 확인해 주세요.',
        )
      }
    }

    throw new Error('Git 변경사항을 불러오지 못했습니다.')
  }
}

export const gitService = {
  getRecentCommits,
}
