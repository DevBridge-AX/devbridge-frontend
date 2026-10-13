import { describe, expect, it } from 'vitest'
import {
  getAnalysisStatusLabel,
  getDocumentTypeLabel,
  getJobRoleLabel,
  getNotificationTypeLabel,
  getTaskRiskLabel,
  getTaskStatusLabel,
} from '@/constants/labels'

describe('getTaskStatusLabel', () => {
  it('매핑된 상태는 라벨을 반환한다', () => {
    expect(getTaskStatusLabel('IN_PROGRESS')).toBe('진행 중')
    expect(getTaskStatusLabel('COMPLETED')).toBe('완료')
    expect(getTaskStatusLabel('DELAYED')).toBe('지연')
  })

  it('매핑이 없으면 상태값 자체를 반환한다', () => {
    expect(getTaskStatusLabel('UNKNOWN')).toBe('UNKNOWN')
  })

  it('빈 값이면 상태 없음을 반환하고 fallback을 우선한다', () => {
    expect(getTaskStatusLabel(undefined)).toBe('상태 없음')
    expect(getTaskStatusLabel(null)).toBe('상태 없음')
    expect(getTaskStatusLabel('UNKNOWN', '-')).toBe('-')
  })
})

describe('getTaskRiskLabel', () => {
  it('위험도 라벨을 반환하고 없으면 미정을 반환한다', () => {
    expect(getTaskRiskLabel('HIGH')).toBe('높음')
    expect(getTaskRiskLabel('X')).toBe('미정')
    expect(getTaskRiskLabel(undefined)).toBe('미정')
  })
})

describe('getDocumentTypeLabel', () => {
  it('문서 유형 라벨을 반환하고 없으면 미분류를 반환한다', () => {
    expect(getDocumentTypeLabel('MEETING_NOTE')).toBe('회의록')
    expect(getDocumentTypeLabel('MEETING')).toBe('회의록')
    expect(getDocumentTypeLabel(null)).toBe('미분류')
  })
})

describe('getAnalysisStatusLabel', () => {
  it('분석 상태 라벨을 반환하고 없으면 분석 미연결을 반환한다', () => {
    expect(getAnalysisStatusLabel('FAILED')).toBe('분석 실패')
    expect(getAnalysisStatusLabel(null)).toBe('분석 미연결')
  })
})

describe('getJobRoleLabel', () => {
  it('직무 라벨을 반환하고 없으면 대시를 반환한다', () => {
    expect(getJobRoleLabel('QA')).toBe('QA')
    expect(getJobRoleLabel('X')).toBe('—')
  })
})

describe('getNotificationTypeLabel', () => {
  it('알림 유형 라벨을 반환하고 없으면 알림을 반환한다', () => {
    expect(getNotificationTypeLabel('MEETING_INVITED')).toBe('회의 초대')
    expect(getNotificationTypeLabel('X')).toBe('알림')
  })
})
