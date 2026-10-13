import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatTime,
  isSameDay,
  toDateKey,
} from '@/utils/date'

const SAMPLE = new Date(2026, 9, 13, 8, 5).toISOString()

describe('formatDateTime', () => {
  it('YYYY-MM-DD HH:mm 형식으로 변환한다', () => {
    expect(formatDateTime(SAMPLE)).toBe('2026-10-13 08:05')
  })

  it('빈 값이나 잘못된 값은 미정을 반환한다', () => {
    expect(formatDateTime(null)).toBe('미정')
    expect(formatDateTime(undefined)).toBe('미정')
    expect(formatDateTime('')).toBe('미정')
    expect(formatDateTime('invalid')).toBe('미정')
  })
})

describe('formatDate', () => {
  it('YYYY-MM-DD 형식으로 변환한다', () => {
    expect(formatDate('2026-10-13T08:05:00')).toBe('2026-10-13')
  })

  it('날짜만 있는 값은 로컬 날짜 그대로 유지한다', () => {
    expect(formatDate('2026-10-13')).toBe('2026-10-13')
    expect(formatDateTime('2026-10-13')).toBe('2026-10-13 00:00')
  })

  it('빈 값이나 잘못된 값은 미정을 반환한다', () => {
    expect(formatDate(null)).toBe('미정')
    expect(formatDate('')).toBe('미정')
    expect(formatDate('invalid')).toBe('미정')
  })
})

describe('formatTime', () => {
  it('24시간제 HH:mm으로 변환한다', () => {
    expect(formatTime('2026-10-13T08:05:00')).toBe('08:05')
    expect(formatTime('2026-10-13T20:30:00')).toBe('20:30')
  })

  it('잘못된 값은 빈 문자열을 반환한다', () => {
    expect(formatTime('invalid')).toBe('')
    expect(formatTime('')).toBe('')
  })
})

describe('toDateKey', () => {
  it('로컬 기준 YYYY-MM-DD 키를 반환한다', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('isSameDay', () => {
  it('같은 날이면 true를 반환한다', () => {
    expect(isSameDay(new Date(2026, 9, 13, 0, 0), new Date(2026, 9, 13, 23, 59))).toBe(true)
  })

  it('다른 날이면 false를 반환한다', () => {
    expect(isSameDay(new Date(2026, 9, 13), new Date(2026, 9, 14))).toBe(false)
    expect(isSameDay(new Date(2026, 9, 13), new Date(2025, 9, 13))).toBe(false)
  })
})

describe('formatRelativeTime', () => {
  const MIN = 60 * 1000
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR

  afterEach(() => {
    vi.useRealTimers()
  })

  function relative(offsetMs: number): string {
    const now = new Date(2026, 9, 13, 12, 0, 0)
    vi.useFakeTimers()
    vi.setSystemTime(now)
    return formatRelativeTime(new Date(now.getTime() - offsetMs).toISOString())
  }

  it('1분 미만이거나 미래면 방금 전을 반환한다', () => {
    expect(relative(30 * 1000)).toBe('방금 전')
    expect(relative(-5 * MIN)).toBe('방금 전')
  })

  it('분, 시간, 일, 개월, 년 단위로 변환한다', () => {
    expect(relative(5 * MIN)).toBe('5분 전')
    expect(relative(3 * HOUR)).toBe('3시간 전')
    expect(relative(2 * DAY)).toBe('2일 전')
    expect(relative(60 * DAY)).toBe('2개월 전')
    expect(relative(800 * DAY)).toBe('2년 전')
  })
})
