import { toApiError } from '@/api/apiError'
import { gitApi } from '@/api/gitApi'
import type { GitCommitItem } from '@/api/gitApi'

async function getRecentCommits(limit = 20): Promise<GitCommitItem[]> {
  try {
    return await gitApi.fetchRecentCommits(limit)
  } catch (error: unknown) {
    throw toApiError(error, 'Git 변경사항을 불러오지 못했습니다.', {
      401: '로그인이 필요하거나 세션이 만료되었습니다.',
      403: 'Git 변경사항을 조회할 권한이 없습니다.',
      500: 'Git 저장소 정보를 읽지 못했습니다. 백엔드의 repository path 설정을 확인해 주세요.',
    })
  }
}

export const gitService = {
  getRecentCommits,
}
