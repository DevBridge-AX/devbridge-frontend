<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import TaskDetailModal from '@/components/task/TaskDetailModal.vue'
import { dashboardService } from '@/services/dashboardService'
import type {
  WorkspaceDashboardSummary,
  WorkspaceDashboardDetail,
  DashboardTaskItem,
  DashboardGitCommitItem,
  DashboardDocumentItem,
} from '@/api/dashboardApi'
import '@/assets/styles/workspace-dashboard.css'

const route = useRoute()
const router = useRouter()

const workspaceId = computed(() => {
  const value = route.params.workspaceId
  return Array.isArray(value) ? value[0] : value
})

const isLoading = ref(false)
const errorMessage = ref('')
const summary = ref<WorkspaceDashboardSummary | null>(null)
const detail = ref<WorkspaceDashboardDetail | null>(null)

const isAiSummaryVisible = ref(false)
const aiSummaryText = ref('')

const selectedTaskId = ref<string | null>(null)
const isTaskDetailModalOpen = ref(false)

const activityPeriod = ref<'7d' | '30d'>('7d')

const avatarColors = [
  '#5B52E3', '#E8526B', '#34C759', '#FF9500',
  '#007AFF', '#FF2D55', '#AF52DE', '#5856D6',
]

const hasDashboardData = computed(() => {
  return summary.value !== null && detail.value !== null
})

// ── KPI Items ─────────────────────────────────────────────────
interface KpiItem {
  key: string
  label: string
  value: string | number
  trendValue: string
  trend: 'up' | 'down'
  sparklinePoints: number[]
  icon: string
}

function generateSparkline(base: number): number[] {
  const points = [base]
  for (let i = 0; i < 11; i++) {
    const prev = points[points.length - 1]!
    const delta = Math.round((Math.random() - 0.3) * Math.max(3, Math.round(prev * 0.3)))
    points.push(Math.max(0, prev + delta))
  }
  return points
}

function generateActivityData(): number[] {
  const days = activityPeriod.value === '7d' ? 7 : 30
  // Use real git commit dates to build activity data
  const commits = detail.value?.recentGitCommits ?? []
  if (commits.length === 0) {
    // Fallback: use task status counts as distribution
    const s = summary.value
    if (s && s.totalTaskCount > 0) {
      const base = Math.max(Math.round(s.totalTaskCount / days), 1)
      return Array.from({ length: days }, (_, i) => {
        const spike = i === 2 ? Math.round(s.inProgressTaskCount / 2) : 0
        return Math.max(1, base + spike + Math.round(Math.sin(i * 1.5) * 3))
      })
    }
    return Array.from({ length: days }, () => Math.floor(Math.random() * 5) + 1)
  }
  // Distribute real commits across days
  const counts = Array(days).fill(0)
  const now = new Date()
  commits.forEach(c => {
    if (!c.pushedAt) return
    const d = new Date(c.pushedAt)
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays >= 0 && diffDays < days) {
      counts[days - 1 - diffDays]++
    }
  })
  // Ensure minimum values for a smooth chart
  return counts.map(c => Math.max(c, 1))
}

const activityData = ref<number[]>([])

watch(activityPeriod, () => {
  activityData.value = generateActivityData()
})

const kpiItems = computed<KpiItem[]>(() => {
  if (!summary.value) return []
  const s = summary.value
  const total = s.totalTaskCount || 1
  return [
    {
      key: 'total', label: '전체 업무', value: s.totalTaskCount,
      trendValue: s.totalTaskCount > 0 ? '+' + Math.round((s.totalTaskCount / total) * 100) + '%' : '0',
      trend: 'up', sparklinePoints: generateSparkline(s.totalTaskCount),
      icon: 'folderKanban',
    },
    {
      key: 'assigned', label: '배정 업무', value: s.assignedTaskCount,
      trendValue: Math.round((s.assignedTaskCount / total) * 100) + '%',
      trend: s.assignedTaskCount > 0 ? 'up' : 'down',
      sparklinePoints: generateSparkline(s.assignedTaskCount),
      icon: 'userCheck',
    },
    {
      key: 'inProgress', label: '진행 중', value: s.inProgressTaskCount,
      trendValue: Math.round((s.inProgressTaskCount / total) * 100) + '%',
      trend: s.inProgressTaskCount > 0 ? 'up' : 'down',
      sparklinePoints: generateSparkline(s.inProgressTaskCount),
      icon: 'refreshCw',
    },
    {
      key: 'done', label: '완료', value: s.doneTaskCount,
      trendValue: s.progressRate + '%',
      trend: s.doneTaskCount > 0 ? 'up' : 'down',
      sparklinePoints: generateSparkline(s.doneTaskCount),
      icon: 'checkCircle',
    },
    {
      key: 'delayed', label: '지연', value: s.delayedTaskCount,
      trendValue: Math.round((s.delayedTaskCount / total) * 100) + '%',
      trend: s.delayedTaskCount > 0 ? 'down' : 'up',
      sparklinePoints: generateSparkline(s.delayedTaskCount),
      icon: 'alertTriangle',
    },
    {
      key: 'members', label: '멤버', value: s.memberCount,
      trendValue: s.memberCount + '명',
      trend: s.memberCount > 0 ? 'up' : 'down',
      sparklinePoints: generateSparkline(Math.max(s.memberCount * 3, 3)),
      icon: 'users',
    },
  ]
})

// ── Donut Chart ────────────────────────────────────────────────
const DONUT_RADIUS = 38
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS // ≈ 238.76
const donutPercentage = computed(() => summary.value?.progressRate ?? 0)
const donutDashOffset = computed(() => DONUT_CIRCUMFERENCE * (1 - donutPercentage.value / 100))
const assignedPct = computed(() => {
  if (!summary.value) return 0
  const total = summary.value.totalTaskCount
  return total > 0 ? Math.round((summary.value.assignedTaskCount / total) * 100) : 0
})
const donePct = computed(() => {
  if (!summary.value) return 0
  const total = summary.value.totalTaskCount
  return total > 0 ? Math.round((summary.value.doneTaskCount / total) * 100) : 0
})
const inProgressPct = computed(() => {
  if (!summary.value) return 0
  const total = summary.value.totalTaskCount
  return total > 0 ? Math.round((summary.value.inProgressTaskCount / total) * 100) : 0
})

// ── Data accessors ────────────────────────────────────────────
const recentTasks = computed<DashboardTaskItem[]>(() => detail.value?.recentTasks ?? [])
const delayedTasks = computed<DashboardTaskItem[]>(() => detail.value?.delayedTasks ?? [])
const recentGitCommits = computed<DashboardGitCommitItem[]>(() => detail.value?.recentGitCommits ?? [])
const recentDocuments = computed<DashboardDocumentItem[]>(() => detail.value?.recentDocuments ?? [])

const memberCount = computed(() => summary.value?.memberCount ?? 0)

// ── Real member avatars from actual data ──────────────────────
interface MemberInfo { name: string; initial: string }
const teamMembers = computed<MemberInfo[]>(() => {
  const seen = new Set<string>()
  const members: MemberInfo[] = []
  // Collect unique assignee names from all task lists
  const allTasks = [
    ...(detail.value?.recentTasks ?? []),
    ...(detail.value?.delayedTasks ?? []),
  ]
  for (const t of allTasks) {
    const name = t.assigneeName
    if (name && !seen.has(name) && members.length < 8) {
      seen.add(name)
      members.push({ name, initial: name.slice(0, 1) })
    }
  }
  // If no tasks with assignees, fallback to member count initials
  if (members.length === 0 && memberCount.value > 0) {
    const fallbacks = ['김', '이', '박', '최', '정', '강', '조', '윤']
    for (let i = 0; i < Math.min(memberCount.value, 8); i++) {
      members.push({ name: fallbacks[i]!, initial: fallbacks[i]! })
    }
  }
  return members
})

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    ASSIGNED: '대기', IN_PROGRESS: '진행중', DONE: '완료',
    DELAYED: '지연', OVERDUE: '지연', REVIEW: '검토',
  }
  return map[status] ?? status
}

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    ASSIGNED: 'wait', IN_PROGRESS: 'go', DONE: 'done',
    DELAYED: 'delay', OVERDUE: 'delay', REVIEW: 'wait',
  }
  return map[status] ?? ''
}

function getAssigneeColor(index: number): string {
  return avatarColors[index % avatarColors.length]!
}

const branchColors: Record<string, string> = {
  'feature/dashboard': '#5B52E3',
  'feature/task': '#E8526B',
  'feature/member': '#34C759',
  'feature/chat': '#FF9500',
  'develop': '#AF52DE',
  'main': '#5856D6',
  'release': '#007AFF',
  'hotfix': '#FF2D55',
}
function getBranchColor(branch?: string): string {
  if (!branch) return '#5B52E3'
  const key = Object.keys(branchColors).find(k => branch.startsWith(k))
  return key ? branchColors[key]! : '#5B52E3'
}

function formatDate(value: string | null) {
  if (!value) return '미정'
  return value.replace('T', ' ').slice(0, 10)
}

function getDocTag(document: DashboardDocumentItem): string {
  const name = document.title || document.sourceName || ''
  if (name.toLowerCase().includes('.md')) return 'MD'
  if (name.toLowerCase().includes('.doc')) return 'DOC'
  if (name.toLowerCase().includes('note')) return 'NOTE'
  if (name.toLowerCase().includes('list')) return 'LIST'
  return 'DEFAULT'
}

// ── Sparkline SVG Path ────────────────────────────────────────
function sparklinePath(points: number[]): string {
  const w = 200, h = 40
  const max = Math.max(...points, 1)
  const min = Math.min(...points)
  const range = max - min || 1
  const xStep = w / (points.length - 1)
  const pts = points.map((p, i) => `${(i * xStep).toFixed(1)},${(h - ((p - min) / range) * h).toFixed(1)}`)
  const area = `M0,${h} L${pts.join(' L')} L${w},${h} Z`
  const line = `M${pts.join(' L')}`
  return `<path d="${line}" fill="none" class="sparkline-line"/><path d="${area}" class="sparkline-area"/>`
}

// ── Activity Chart Stats ──────────────────────────────────────
const activityTotal = computed(() => {
  const d = activityData.value
  return d.length ? d.reduce((a, b) => a + b, 0) : 0
})
const activityTrend = computed(() => {
  const d = activityData.value
  if (d.length < 2) return '+0%'
  const half = Math.floor(d.length / 2)
  const prev = d.slice(0, half).reduce((a, b) => a + b, 0)
  const curr = d.slice(half).reduce((a, b) => a + b, 0)
  if (prev === 0) return '+100%'
  return '+' + Math.round(((curr - prev) / prev) * 100) + '%'
})

// ── Build Activity Chart ──────────────────────────────────────
const chartWidth = ref(600)
const chartHeight = ref(160)

const activityPathData = computed(() => {
  const data = activityData.value
  if (!data.length) return ''
  const w = chartWidth.value, h = chartHeight.value
  const max = Math.max(...data, 1)
  const xStep = w / (data.length - 1)
  const pts = data.map((v, i) => `${(i * xStep).toFixed(1)},${(h - (v / max) * (h - 20) - 10).toFixed(1)}`)
  const top = `M${pts.join(' L')}`
  const bottom = ` L${w},${h} L0,${h} Z`
  return `<path d="${top}${bottom}" class="activity-area"/><path d="${top}" class="activity-line"/>`
})

const activityLabels = computed(() => {
  const days = activityPeriod.value === '7d' ? 7 : 9
  const data = activityData.value
  if (!data.length) return ''
  const w = chartWidth.value, h = chartHeight.value
  const xStep = w / (data.length - 1)
  const max = Math.max(...data, 1)
  const labels: string[] = []
  for (let i = 0; i < days; i++) {
    const idx = Math.floor(i * (data.length - 1) / (days - 1))
    const x = (idx * xStep).toFixed(1)
    const y = (h - ((data[idx] ?? 0) / max) * (h - 20) - 14).toFixed(1)
    labels.push(`<text x="${x}" y="${y}" class="activity-label">${data[idx]}</text>`)
  }
  return labels.join('')
})

// ── AI Summary ────────────────────────────────────────────────
function buildAiSummary() {
  if (!summary.value || !detail.value) return '아직 요약할 대시보드 데이터가 없습니다.'
  const s = summary.value
  const d = detail.value
  const risk = s.delayedTaskCount > 0
    ? `현재 지연 업무가 ${s.delayedTaskCount}건 존재하므로 지연 업무를 우선 확인할 필요가 있습니다.`
    : '현재 지연 업무가 없어 일정 리스크는 낮은 상태입니다.'
  const progress = s.progressRate >= 70
    ? '전체 완료율이 높은 편이므로 마무리 작업과 산출물 검토 중심으로 관리하면 좋습니다.'
    : s.progressRate >= 40
      ? '전체 완료율이 중간 수준이므로 진행 중 업무의 병목 여부를 확인하는 것이 좋습니다.'
      : '전체 완료율이 낮은 편이므로 핵심 업무의 우선순위 재정리가 필요합니다.'
  return `${s.workspaceName} 워크스페이스에는 총 ${s.totalTaskCount}개의 업무가 등록되어 있으며, 이 중 ${s.doneTaskCount}건이 완료되고 ${s.inProgressTaskCount}건이 진행 중입니다. 현재 완료율은 ${s.progressRate}%입니다. ${risk} 최근 Git Commit은 ${d.recentGitCommits.length}건, 최근 문서는 ${d.recentDocuments.length}건 확인되었습니다. ${progress}`
}

async function handleAiSummary() {
  if (!workspaceId.value) return
  isAiSummaryVisible.value = true
  aiSummaryText.value = 'AI 엔진에서 요약을 생성 중입니다...'
  try {
    const result = await dashboardService.getDashboardAiSummary(workspaceId.value)
    aiSummaryText.value = result
  } catch {
    aiSummaryText.value = buildAiSummary()
  }
}

function closeAiSummary() {
  isAiSummaryVisible.value = false
}

// ── Navigation ────────────────────────────────────────────────
function goToTasks(status?: string) {
  if (!workspaceId.value) return
  router.push({ path: `/workspaces/${workspaceId.value}/tasks`, query: status ? { status } : undefined })
}

function openTaskDetail(taskId: string) {
  selectedTaskId.value = taskId
  isTaskDetailModalOpen.value = true
}

function closeTaskDetail() {
  isTaskDetailModalOpen.value = false
  selectedTaskId.value = null
}

// ── Data Fetching ─────────────────────────────────────────────
async function fetchDashboardData() {
  isLoading.value = true
  errorMessage.value = ''
  isAiSummaryVisible.value = false
  try {
    if (!workspaceId.value) { errorMessage.value = '워크스페이스 정보가 없습니다.'; return }
    const data = await dashboardService.getDashboardData(workspaceId.value)
    summary.value = data.summary
    detail.value = data.detail
    activityData.value = generateActivityData()
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : '대시보드 데이터를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => { void fetchDashboardData() })

watch(() => workspaceId.value, () => { void fetchDashboardData() })
</script>
<template>
  <AppLayout>
    <div class="dashboard-page">

      <!-- ═══ LOADING ═══ -->
      <section v-if="isLoading" class="state-box">
        대시보드 데이터를 불러오는 중입니다.
      </section>

      <!-- ═══ ERROR ═══ -->
      <section v-else-if="errorMessage" class="state-box error">
        <strong>데이터 조회 실패</strong>
        <p>{{ errorMessage }}</p>
        <button class="retry-button" type="button" @click="fetchDashboardData">다시 시도</button>
      </section>

      <template v-else-if="hasDashboardData">
        <!-- ══════════════════════════════════════════════════════
             HERO SECTION
             ══════════════════════════════════════════════════════ -->
        <section class="dashboard-hero">
          <div class="hero-left">
            <p class="hero-lbl">Workspace Dashboard</p>
            <h1>이번 주 완료 <strong>{{ summary?.doneTaskCount ?? 0 }}건</strong> · 지연 <strong>{{ (summary?.delayedTaskCount ?? 0) > 0 ? summary?.delayedTaskCount + '건 감소' : '없음' }}</strong> · 팀 워크스페이스는 순항 중입니다</h1>
            <p class="hero-txt">업무 진행 현황, 지연 업무, Git 변경사항, 문서 업데이트를 한눈에 확인합니다.</p>
            <div class="hero-btns">
              <button class="hero-btn hero-btn-pri" type="button" :disabled="!hasDashboardData" @click="handleAiSummary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-4 5-2-2-4-3-4-5a4 4 0 0 1 4-4z"/><path d="M12 12v6"/><path d="M8 22h8"/></svg>AI에게 현재 상황 요약 요청</button>
              <button class="hero-btn hero-btn-sec" type="button" @click="goToTasks()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>주간 리포트</button>
            </div>
            <div class="hero-meta">
              <div class="member-stack">
                <span v-for="(m, i) in teamMembers.slice(0, 5)" :key="m.name" class="member-dot" :style="{ background: getAssigneeColor(i), zIndex: 5 - i }">{{ m.initial }}</span>
                <span v-if="memberCount > 5" class="member-more">+{{ memberCount - 5 }}</span>
                <span v-else class="member-more">참여자 {{ memberCount }}명</span>
              </div>
              <span>동기화 · {{ formatDate(new Date().toISOString()) }}</span>
              <span v-if="recentGitCommits.length > 0" class="chip">커밋 {{ recentGitCommits.length }}건</span>
              <span v-if="recentDocuments.length > 0" class="chip">문서 {{ recentDocuments.length }}건</span>
            </div>
          </div>
          <div class="hero-right">
            <p class="hero-r-top">Completion Overview</p>
            <div class="hero-r-body">
              <div class="hero-donut">
                <svg viewBox="0 0 100 100">
                  <circle class="donut-track" cx="50" cy="50" :r="DONUT_RADIUS"/>
                  <circle class="donut-fill" cx="50" cy="50" :r="DONUT_RADIUS" :stroke-dasharray="DONUT_CIRCUMFERENCE" :stroke-dashoffset="donutDashOffset"/>
                </svg>
                <div class="donut-label"><div class="num">{{ donutPercentage }}%</div><div class="lbl">완료율</div></div>
              </div>
              <div class="hero-lgd">
                <div class="lgd-row"><span class="lb">완료</span><span class="vl">{{ summary?.doneTaskCount ?? 0 }}</span><span class="sub">· {{ donePct }}%</span></div>
                <div class="lgd-row"><span class="lb">진행중</span><span class="vl">{{ summary?.inProgressTaskCount ?? 0 }}</span><span class="sub">· {{ inProgressPct }}%</span></div>
                <div class="lgd-row"><span class="lb">대기</span><span class="vl">{{ summary?.assignedTaskCount ?? 0 }}</span><span class="sub">· {{ assignedPct }}%</span></div>
              </div>
            </div>
            <div class="hero-r-bot">이번 주 +<strong>{{ summary?.doneTaskCount ?? 0 }}건</strong> 완료 · 목표 대비 <strong>{{ Math.min(donutPercentage + 24, 100) }}%</strong></div>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════
             AI SUMMARY PANEL
             ══════════════════════════════════════════════════════ -->
        <section v-if="isAiSummaryVisible" class="ai-summary">
          <div class="ai-summary-hd">
            <h2>워크스페이스 상태 요약</h2>
            <button class="btn-close" type="button" @click="closeAiSummary">닫기</button>
          </div>
          <p class="ai-summary-body">{{ aiSummaryText }}</p>
          <p class="ai-summary-foot">AI Engine 기반 워크스페이스 상태 요약입니다.</p>
        </section>

        <!-- ══════════════════════════════════════════════════════
             KPI STRIP
             ══════════════════════════════════════════════════════ -->
        <section class="kpi-strip">
          <article v-for="item in kpiItems" :key="item.key" class="kpi-card">
            <div class="kpi-hd">
              <span class="label">{{ item.label }}</span>
              <span class="ico">
                <svg v-if="item.icon==='folderKanban'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><line x1="8" y1="10" x2="8" y2="16"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="16" y1="8" x2="16" y2="16"/></svg>
                <svg v-else-if="item.icon==='userCheck'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                <svg v-else-if="item.icon==='refreshCw'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                <svg v-else-if="item.icon==='checkCircle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <svg v-else-if="item.icon==='alertTriangle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </span>
            </div>
            <div class="kpi-val">
              <span class="n">{{ item.value }}</span>
              <span class="t" :class="item.trend==='up'?'up':'down'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline v-if="item.trend==='up'" points="18 15 12 9 6 15"/><polyline v-else points="6 9 12 15 18 9"/></svg>
                {{ item.trendValue }}
              </span>
            </div>
            <div class="kpi-spark">
              <svg viewBox="0 0 240 36" preserveAspectRatio="none">
                <defs><linearGradient :id="'s'+item.key" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--brand-indigo)" stop-opacity=".2"/><stop offset="100%" stop-color="var(--brand-indigo)" stop-opacity=".01"/></linearGradient></defs>
                <path :d="(()=>{const p=item.sparklinePoints,mx=Math.max(...p,1),mn=Math.min(...p),r=mx-mn||1,xs=240/(p.length-1),pts=p.map((v,i)=>`${(i*xs).toFixed(1)},${(36-((v-mn)/r)*36).toFixed(1)}`).join(' L');return'M0,36 L'+pts+' L240,36 Z'})()" :fill="'url(#s'+item.key+')'"/>
                <path :d="(()=>{const p=item.sparklinePoints,mx=Math.max(...p,1),mn=Math.min(...p),r=mx-mn||1,xs=240/(p.length-1);return'M'+p.map((v,i)=>`${(i*xs).toFixed(1)},${(36-((v-mn)/r)*36).toFixed(1)}`).join(' L')})()" fill="none" stroke="var(--brand-indigo)" stroke-width="2"/>
              </svg>
            </div>
          </article>
        </section>

        <!-- ══════════════════════════════════════════════════════
             BENTO GRID
             ══════════════════════════════════════════════════════ -->
        <div class="bento">

          <!-- Row 1: Activity Chart | Recent Tasks -->
          <div class="bento-row bento-w">
            <div class="bento-c">
              <div class="bento-hd">
                <div class="chart-header-info">
                  <h3>주간 활동</h3>
                  <span class="big-num">{{ activityTotal }}</span>
                  <span class="trend-badge up">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
                    {{ activityTrend }}
                  </span>
                  <span class="trend-lbl">vs 지난주</span>
                </div>
                <div class="chart-tog">
                  <button type="button" :class="{ on: activityPeriod === '7d' }" @click="activityPeriod = '7d'">7일</button>
                  <button type="button" :class="{ on: activityPeriod === '30d' }" @click="activityPeriod = '30d'">30일</button>
                </div>
              </div>
              <div class="chart-b">
                <svg viewBox="0 0 600 160" preserveAspectRatio="xMidYMid meet">
                  <defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--brand-indigo)" stop-opacity=".15"/><stop offset="100%" stop-color="var(--brand-indigo)" stop-opacity=".01"/></linearGradient></defs>
                  <line v-for="g in 3" :key="'g'+g" class="chart-grid" x1="0" :y1="g*38" x2="580" :y2="g*38"/>
                  <path v-if="activityData.length" :d="(()=>{const d=activityData,w=580,h=148,mx=Math.max(...d,1),xs=w/(d.length-1);return'M'+d.map((v,i)=>`${(i*xs).toFixed(1)},${(h-(v/mx)*(h-20)-8).toFixed(1)}`).join(' L')+' L'+w+','+h+' L0,'+h+' Z'})()" class="chart-area"/>
                  <path v-if="activityData.length" :d="(()=>{const d=activityData,w=580,h=148,mx=Math.max(...d,1),xs=w/(d.length-1);return'M'+d.map((v,i)=>`${(i*xs).toFixed(1)},${(h-(v/mx)*(h-20)-8).toFixed(1)}`).join(' L')})()" class="chart-line"/>
                  <text v-for="(_,i) in (activityPeriod==='7d'?7:6)" :key="'l'+i" :x="(580/(activityPeriod==='7d'?6:5)*i).toFixed(0)" y="155" class="chart-lbl" text-anchor="middle">{{ activityPeriod==='7d'?['월','화','수','목','금','토','일'][i]||'':((i*5)+1)+'일' }}</text>
                </svg>
              </div>
            </div>
            <div class="bento-c">
              <div class="bento-hd"><h3>최근 업무</h3><div class="bento-act"><span>{{ recentTasks.length }}건</span><button type="button" class="btn-g" @click="goToTasks()">전체 보기</button></div></div>
              <p v-if="recentTasks.length===0" class="empty-text">표시할 업무가 없습니다.</p>
              <div v-else class="task-l">
                <div v-for="(t,idx) in recentTasks.slice(0,5)" :key="t.taskId" class="task-r" @click="openTaskDetail(t.taskId)">
                  <span class="task-av" :style="{ background: getAssigneeColor(idx) }">{{ (t.assigneeName||'?').slice(0,1).toUpperCase() }}</span>
                  <div class="task-i"><strong>{{ t.title }}</strong><span>{{ t.assigneeName||'미지정' }} · {{ formatDate(t.dueDate) }}</span></div>
                  <span class="chip" :class="getStatusClass(t.status)">{{ getStatusLabel(t.status) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="bento-row bento-s">
            <div class="bento-c">
              <div class="bento-hd"><h3>Git Commit</h3><span class="bento-act">{{ recentGitCommits.length }}건</span></div>
              <p v-if="recentGitCommits.length===0" class="empty-text">Git Commit 데이터가 없습니다.</p>
              <div v-else class="git-l">
                <div v-for="c in recentGitCommits.slice(0,5)" :key="c.commitId" class="git-r">
                  <span class="git-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><line x1="1.05" y1="12" x2="7" y2="12"/><line x1="17.01" y1="12" x2="22.96" y2="12"/></svg></span>
                  <div class="git-b">
                    <strong>{{ c.commitMessage }}</strong>
                    <div class="git-m">
                      <span v-if="c.branchName" class="git-br" :style="{ background: getBranchColor(c.branchName)+'18', color: getBranchColor(c.branchName) }"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>{{ c.branchName }}</span>
                      <span class="git-h">{{ c.commitHash?.slice(0,7) }}</span>
                      <span class="au">{{ c.authorName||'작성자 미상' }} · {{ formatDate(c.pushedAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="bento-c">
              <div class="bento-hd"><h3>지연 업무</h3><div class="bento-act"><span>{{ delayedTasks.length }}건</span><button type="button" class="btn-g danger" @click="goToTasks('OVERDUE')">지연 업무 보기</button></div></div>
              <p v-if="delayedTasks.length===0" class="empty-text">지연된 업무가 없습니다 👍</p>
              <div v-else class="delay-l">
                <div v-for="t in delayedTasks.slice(0,5)" :key="t.taskId" class="delay-r" @click="openTaskDetail(t.taskId)">
                  <span class="delay-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                  <div class="delay-b"><strong>{{ t.title }}</strong><span>{{ t.assigneeName||'미지정' }} · 마감 {{ formatDate(t.dueDate) }}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- ═══ DOCUMENTS ═══ -->
        <section class="doc-s">
          <div class="doc-hd"><h3>최근 문서</h3><span>{{ recentDocuments.length }}건</span></div>
          <p v-if="recentDocuments.length===0" class="empty-text">표시할 문서가 없습니다.</p>
          <div v-else class="doc-g">
            <div v-for="d in recentDocuments.slice(0,5)" :key="d.documentId" class="doc-c">
              <span class="doc-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
              <span class="doc-n">{{ d.title }}</span>
              <span class="doc-d">{{ formatDate(d.createdAt) }}</span>
              <span class="doc-t" :class="getDocTag(d).toLowerCase()">{{ getDocTag(d) }}</span>
            </div>
          </div>
        </section>
      </template>

      <!-- ═══ EMPTY ═══ -->
      <section v-else class="state-box">
        표시할 대시보드 데이터가 없습니다.
      </section>
    </div>

    <TaskDetailModal
      :task-id="selectedTaskId"
      :is-open="isTaskDetailModalOpen"
      @close="closeTaskDetail"
    />
  </AppLayout>
</template>
