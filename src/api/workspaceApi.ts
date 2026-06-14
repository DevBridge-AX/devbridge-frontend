export interface WorkspaceMemberResponse {
  userId: string
  employeeId: string
  name: string
  department: string
  position: string
}

// ─── 임시 Mock 데이터베이스 (인사 시스템 시드 데이터 기준) ────────────────────
// EMP004(본인)는 검색에서 제외됩니다.
const MOCK_MEMBERS: WorkspaceMemberResponse[] = [
  { userId: '1', employeeId: 'EMP001', name: '김현수', department: '인사팀', position: '팀장' },
  { userId: '2', employeeId: 'EMP002', name: '이원빈', department: '개발팀', position: '사원' },
  { userId: '3', employeeId: 'EMP003', name: '최형수', department: '기획팀', position: '팀장' },
  { userId: '5', employeeId: 'EMP005', name: '김현수', department: '기획팀', position: '대리' },
]

export const workspaceApi = {
  /**
   * 워크스페이스 멤버 검색 (Mock)
   */
  searchMembers(keyword: string): Promise<WorkspaceMemberResponse[]> {
    const trimmed = keyword.trim()
    if (!trimmed) {
      return Promise.resolve([])
    }
    const filtered = MOCK_MEMBERS.filter((member) =>
      member.name.includes(trimmed)
    )
    return Promise.resolve(filtered)
  },
}
