const EMPTY_DATE_LABEL = '미정'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  // 'YYYY-MM-DD'는 new Date()가 UTC 자정으로 해석하므로 로컬 날짜로 생성
  const dateOnly = DATE_ONLY_PATTERN.exec(value)
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Date를 로컬 기준 'YYYY-MM-DD' 키로 변환 */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** ISO 문자열을 'YYYY-MM-DD'로 포맷 (없거나 유효하지 않으면 '미정') */
export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return EMPTY_DATE_LABEL
  return toDateKey(date)
}

/** ISO 문자열을 'YYYY-MM-DD HH:mm'으로 포맷 (없거나 유효하지 않으면 '미정') */
export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return EMPTY_DATE_LABEL
  return `${toDateKey(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** ISO 문자열을 24시간제 'HH:mm'으로 포맷 (유효하지 않으면 빈 문자열) */
export function formatTime(value: string): string {
  const date = parseDate(value)
  if (!date) return ''
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 두 날짜가 로컬 기준 같은 날인지 비교 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** ISO 문자열을 '방금 전', 'N분 전' 등 상대 시간으로 포맷 */
export function formatRelativeTime(value: string): string {
  const now = Date.now()
  const target = new Date(value).getTime()
  const diff = now - target
  if (diff < 0) return '방금 전'

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '방금 전'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}개월 전`

  return `${Math.floor(months / 12)}년 전`
}
