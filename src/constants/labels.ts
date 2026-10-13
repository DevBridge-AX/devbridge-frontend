// ─── 업무 상태 ─────────────────────────────────────────────────────────────
export const TASK_STATUS_LABEL: Record<string, string> = {
  ASSIGNED: '배정',
  IN_PROGRESS: '진행 중',
  REVIEW: '검토',
  DONE: '완료',
  COMPLETED: '완료',
  CANCELLED: '취소',
  OVERDUE: '지연',
  DELAYED: '지연',
}

/** 업무 상태 라벨 (매핑이 없으면 fallback, 기본은 상태값 자체 또는 '상태 없음') */
export function getTaskStatusLabel(
  status: string | null | undefined,
  fallback?: string,
): string {
  if (status) {
    const label = TASK_STATUS_LABEL[status]
    if (label) return label
  }
  return fallback ?? (status || '상태 없음')
}

// ─── 업무 위험도 ───────────────────────────────────────────────────────────
export const TASK_RISK_LABEL: Record<string, string> = {
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
}

/** 업무 위험도 라벨 (없으면 '미정') */
export function getTaskRiskLabel(riskLevel: string | null | undefined): string {
  return (riskLevel && TASK_RISK_LABEL[riskLevel]) || '미정'
}

// ─── 문서 유형 ─────────────────────────────────────────────────────────────
export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  REPORT: '보고서',
  MEETING_NOTE: '회의록',
  GUIDE: '지침',
  REFERENCE: '참고자료',
  TECH: '기술 문서',
  PLANNING: '기획 문서',
  DESIGN: '디자인 문서',
  MEETING: '회의록',
  GIT: 'Git 문서',
  ETC: '기타',
}

/** 문서 유형 라벨 (없으면 '미분류') */
export function getDocumentTypeLabel(type: string | null | undefined): string {
  return (type && DOCUMENT_TYPE_LABEL[type]) || '미분류'
}

// ─── 문서 분석 상태 ────────────────────────────────────────────────────────
export const DOCUMENT_ANALYSIS_LABEL: Record<string, string> = {
  COMPLETED: '분석 완료',
  PROCESSING: '분석 중',
  PENDING: '분석 대기',
  FAILED: '분석 실패',
}

/** 문서 분석 상태 라벨 (없으면 '분석 미연결') */
export function getAnalysisStatusLabel(status: string | null | undefined): string {
  return (status && DOCUMENT_ANALYSIS_LABEL[status]) || '분석 미연결'
}

// ─── 직무 ──────────────────────────────────────────────────────────────────
export const JOB_ROLE_OPTIONS = [
  { value: 'PLANNER', label: '기획자' },
  { value: 'DEVELOPER', label: '개발자' },
  { value: 'QA', label: 'QA' },
  { value: 'DESIGNER', label: '디자이너' },
  { value: 'OPERATOR', label: '운영자' },
  { value: 'NEWCOMER', label: '신규투입자' },
] as const

/** 직무 라벨 (없으면 '—') */
export function getJobRoleLabel(value: string | null | undefined): string {
  return JOB_ROLE_OPTIONS.find((opt) => opt.value === value)?.label ?? '—'
}

// ─── 알림 유형 ─────────────────────────────────────────────────────────────
export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  MEETING_INVITED: '회의 초대',
  MEETING_UPDATED: '회의 변경',
  MEETING_CANCELED: '회의 취소',
  MEETING_CONFIRMED: '회의 확정',
  MEETING_REOPENED: '회의 재조율',
  MEETING_REMINDER: '회의 임박 알림',
  OWNER_CONFIRMATION: '담당자 확인 요청',
  OWNER_ANSWER_RECEIVED: '담당자 답변',
}

/** 알림 유형 라벨 (없으면 '알림') */
export function getNotificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABEL[type] ?? '알림'
}
