<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { settingService } from '@/services/settingService'
import type { UserProfile } from '@/api/settingApi'

// ─── 프로필 데이터 ─────────────────────────────────────────────────────────
const profile = ref<UserProfile | null>(null)
const isLoadingProfile = ref(true)
const loadError = ref('')

// ─── 화면 모드 ────────────────────────────────────────────────────────────
const mode = ref<'read' | 'verify' | 'edit'>('read')

// ─── 인증 입력 필드 ─────────────────────────────────────────────────────────
const verifyInputPassword = ref('')
const isVerifying = ref(false)
const verifyError = ref('')
const verifiedCurrentPassword = ref('') // 임시 보관용 현재 비밀번호

// ─── 직무 옵션 ────────────────────────────────────────────────────────────
const JOB_ROLE_OPTIONS = [
  { value: 'PLANNER', label: '기획자' },
  { value: 'DEVELOPER', label: '개발자' },
  { value: 'QA', label: 'QA' },
  { value: 'DESIGNER', label: '디자이너' },
  { value: 'OPERATOR', label: '운영자' },
  { value: 'NEWCOMER', label: '신규투입자' },
] as const

function getJobRoleLabel(value: string): string {
  return JOB_ROLE_OPTIONS.find((opt) => opt.value === value)?.label ?? '—'
}

// ─── 편집 폼 필드 ──────────────────────────────────────────────────────────
const editName = ref('')
const editJobRole = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')

// ─── 저장 상태 ────────────────────────────────────────────────────────────
const isSaving = ref(false)
const saveStatus = ref<'idle' | 'success' | 'error'>('idle')
const saveMessage = ref('')

// ─── 마운트 시 프로필 로드 ─────────────────────────────────────────────────
onMounted(async () => {
  try {
    profile.value = await settingService.getProfile()
    editName.value = profile.value.name
    editJobRole.value = profile.value.jobRole ?? ''
  } catch {
    loadError.value = '프로필 정보를 불러오지 못했습니다. 페이지를 새로고침해 주세요.'
  } finally {
    isLoadingProfile.value = false
  }
})

// ─── 비밀번호 인증 핸들러 ──────────────────────────────────────────────────
async function handleVerifyPassword(): Promise<void> {
  if (!verifyInputPassword.value) {
    verifyError.value = '비밀번호를 입력해 주세요.'
    return
  }

  isVerifying.value = true
  verifyError.value = ''

  try {
    await settingService.verifyPassword(verifyInputPassword.value)
    // 인증 성공 시 현재 비밀번호 보관 후 수정 모드로 전환
    verifiedCurrentPassword.value = verifyInputPassword.value
    mode.value = 'edit'
    verifyInputPassword.value = ''
  } catch (e: unknown) {
    verifyError.value = e instanceof Error ? e.message : '비밀번호 인증에 실패했습니다.'
  } finally {
    isVerifying.value = false
  }
}

// ─── 인증 취소 핸들러 ──────────────────────────────────────────────────────
function cancelVerify(): void {
  mode.value = 'read'
  verifyInputPassword.value = ''
  verifyError.value = ''
}

// ─── 편집 취소 핸들러 ──────────────────────────────────────────────────────
function cancelEdit(): void {
  mode.value = 'read'
  // 값 초기화
  editName.value = profile.value?.name ?? ''
  editJobRole.value = profile.value?.jobRole ?? ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  verifiedCurrentPassword.value = ''
  saveStatus.value = 'idle'
  saveMessage.value = ''
}

// ─── 저장 핸들러 ──────────────────────────────────────────────────────────
async function handleSave(): Promise<void> {
  saveStatus.value = 'idle'

  const nameChanged = editName.value.trim() && editName.value.trim() !== profile.value?.name
  const jobRoleChanged = editJobRole.value && editJobRole.value !== profile.value?.jobRole
  const isChangingPassword = !!(newPassword.value || confirmNewPassword.value)

  if (!nameChanged && !jobRoleChanged && !isChangingPassword) {
    saveStatus.value = 'error'
    saveMessage.value = '변경된 정보가 없습니다.'
    return
  }

  // 비밀번호 변경 시 유효성 검증
  if (isChangingPassword) {
    if (newPassword.value.length < 8) {
      saveStatus.value = 'error'
      saveMessage.value = '새 비밀번호는 8자 이상이어야 합니다.'
      return
    }
    if (newPassword.value !== confirmNewPassword.value) {
      saveStatus.value = 'error'
      saveMessage.value = '새 비밀번호가 확인란과 일치하지 않습니다.'
      return
    }
  }

  isSaving.value = true

  try {
    // 1. 프로필 정보 수정
    if (nameChanged || jobRoleChanged) {
      const payload: Record<string, string> = {}
      if (nameChanged) payload.name = editName.value.trim()
      if (jobRoleChanged) payload.jobRole = editJobRole.value
      await settingService.modifyProfile(payload)
      if (profile.value) {
        if (nameChanged) profile.value.name = editName.value.trim()
        if (jobRoleChanged) profile.value.jobRole = editJobRole.value
      }
    }

    // 2. 비밀번호 변경
    if (isChangingPassword) {
      await settingService.changePassword({
        currentPassword: verifiedCurrentPassword.value,
        newPassword: newPassword.value,
      })
    }

    // 성공 처리
    saveStatus.value = 'success'
    const profileChanged = nameChanged || jobRoleChanged
    if (profileChanged && isChangingPassword) {
      saveMessage.value = '프로필 정보와 비밀번호가 성공적으로 업데이트되었습니다.'
    } else if (profileChanged) {
      saveMessage.value = '프로필 정보가 성공적으로 업데이트되었습니다.'
    } else {
      saveMessage.value = '비밀번호가 성공적으로 변경되었습니다.'
    }

    // 폼 입력값 및 인증 상태 초기화
    newPassword.value = ''
    confirmNewPassword.value = ''
    verifiedCurrentPassword.value = ''

    // 1.5초 후 1단계(읽기 전용) 뷰로 이동
    setTimeout(() => {
      mode.value = 'read'
      saveStatus.value = 'idle'
      saveMessage.value = ''
    }, 1500)

  } catch (e: unknown) {
    saveStatus.value = 'error'
    saveMessage.value = e instanceof Error ? e.message : '저장에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="profile-page">
    <!-- 배경 장식 -->
    <div class="bg-orb bg-orb--1" />
    <div class="bg-orb bg-orb--2" />

    <div class="profile-container">
      <!-- 페이지 헤더 -->
      <div class="page-header">
        <div class="header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h1 class="page-title">내 프로필</h1>
          <p class="page-subtitle">계정 정보를 확인하고 수정하세요</p>
        </div>
      </div>

      <!-- 로드 중 -->
      <div v-if="isLoadingProfile" class="loading-state">
        <span class="spinner spinner--lg" />
        <p>프로필 정보를 불러오는 중...</p>
      </div>

      <!-- 로드 실패 -->
      <div v-else-if="loadError" class="error-state">
        <p>{{ loadError }}</p>
      </div>

      <!-- 프로필 카드 -->
      <div v-else-if="profile" class="profile-card" role="main">

        <!-- ── 읽기 전용 모드 (Default Mode) ── -->
        <div v-if="mode === 'read' || mode === 'verify'" class="read-mode-container">
          <div class="card-header">
            <div class="card-header-left">
              <span class="legend-dot legend-dot--accent" />
              <h2 class="card-title">내 계정 정보</h2>
            </div>
            <button class="edit-mode-btn" type="button" @click="mode = 'verify'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="edit-icon">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              수정
            </button>
          </div>

          <div class="fields-grid">
            <div class="field">
              <label class="field-label">이름 (닉네임)</label>
              <div class="field-readonly">{{ profile.name }}</div>
            </div>
            <div class="field">
              <label class="field-label">사번</label>
              <div class="field-readonly">{{ profile.employeeId }}</div>
            </div>
            <div class="field">
              <label class="field-label">이메일</label>
              <div class="field-readonly">{{ profile.email }}</div>
            </div>
            <div class="field">
              <label class="field-label">부서</label>
              <div class="field-readonly">{{ profile.department ?? '—' }}</div>
            </div>
            <div class="field">
              <label class="field-label">직급</label>
              <div class="field-readonly">{{ profile.position ?? '—' }}</div>
            </div>
            <div class="field">
              <label class="field-label">직무</label>
              <div class="field-readonly">{{ getJobRoleLabel(profile.jobRole) }}</div>
            </div>
          </div>
        </div>

        <!-- ── 본인 인증 모달 (Verify Mode) ── -->
        <div v-if="mode === 'verify'" class="modal-overlay" role="dialog" aria-modal="true">
          <div class="modal-content">
            <div class="modal-header">
              <div class="modal-title-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="modal-icon">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h3 class="modal-title">본인 인증</h3>
              </div>
              <button class="modal-close-btn" type="button" @click="cancelVerify">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p class="modal-desc">
              회원 정보를 수정하려면 본인 확인을 위해 현재 비밀번호를 입력하셔야 합니다.
            </p>
            <form class="modal-form" @submit.prevent="handleVerifyPassword">
              <div class="field">
                <label class="field-label" for="verify-password">현재 비밀번호</label>
                <input
                  id="verify-password"
                  v-model="verifyInputPassword"
                  type="password"
                  class="field-input"
                  placeholder="현재 비밀번호 입력"
                  required
                  :disabled="isVerifying"
                  autocomplete="current-password"
                />
              </div>
              <p v-if="verifyError" class="field-hint verify-error">{{ verifyError }}</p>
              <div class="modal-actions">
                <button type="button" class="btn btn--secondary" @click="cancelVerify" :disabled="isVerifying">
                  취소
                </button>
                <button type="submit" class="btn btn--primary" :disabled="isVerifying">
                  <span v-if="isVerifying" class="spinner" />
                  <span v-else>인증 및 수정하기</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- ── 수정 모드 (Edit Mode) ── -->
        <form v-if="mode === 'edit'" class="profile-form" @submit.prevent="handleSave">
          <fieldset class="form-section">
            <legend class="section-legend">
              <span class="legend-dot legend-dot--accent" />
              프로필 수정
            </legend>

            <!-- 이름 -->
            <div class="field">
              <label class="field-label" for="edit-name">이름 (닉네임)</label>
              <input
                id="edit-name"
                v-model="editName"
                type="text"
                class="field-input"
                placeholder="이름을 입력하세요"
                required
                :disabled="isSaving"
                autocomplete="name"
              />
            </div>

            <!-- 직무 -->
            <div class="field">
              <label class="field-label" for="edit-jobRole">직무</label>
              <select
                id="edit-jobRole"
                v-model="editJobRole"
                class="field-input"
                :disabled="isSaving"
              >
                <option value="" disabled>직무를 선택해 주세요</option>
                <option v-for="opt in JOB_ROLE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- 구분선 -->
            <div class="divider">
              <span class="divider-label">비밀번호 변경 (선택)</span>
            </div>

            <!-- 새 비밀번호 -->
            <div class="field">
              <label class="field-label" for="new-password">새 비밀번호</label>
              <input
                id="new-password"
                v-model="newPassword"
                type="password"
                class="field-input"
                :class="{ 'input--warn': newPassword && newPassword.length < 8 }"
                placeholder="변경하지 않으려면 빈칸으로 유지 (8자 이상)"
                :disabled="isSaving"
                autocomplete="new-password"
              />
              <p v-if="newPassword && newPassword.length < 8" class="field-hint">
                비밀번호는 8자 이상이어야 합니다.
              </p>
            </div>

            <!-- 새 비밀번호 확인 -->
            <div class="field">
              <label class="field-label" for="confirm-new-password">새 비밀번호 확인</label>
              <input
                id="confirm-new-password"
                v-model="confirmNewPassword"
                type="password"
                class="field-input"
                :class="{ 'input--warn': confirmNewPassword && newPassword !== confirmNewPassword }"
                placeholder="새 비밀번호 다시 입력"
                :disabled="isSaving"
                autocomplete="new-password"
              />
              <p v-if="confirmNewPassword && newPassword !== confirmNewPassword" class="field-hint text-warn">
                비밀번호가 일치하지 않습니다.
              </p>
            </div>
          </fieldset>

          <!-- 저장 결과 메시지 -->
          <div
            v-if="saveStatus !== 'idle'"
            class="status-banner"
            :class="saveStatus === 'success' ? 'banner--success' : 'banner--error'"
            role="alert"
          >
            <svg v-if="saveStatus === 'success'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {{ saveMessage }}
          </div>

          <!-- 저장/취소 버튼 -->
          <div class="form-actions gap-12">
            <button
              type="button"
              class="btn btn--secondary"
              @click="cancelEdit"
              :disabled="isSaving"
            >
              취소
            </button>
            <button
              id="profile-save-btn"
              type="submit"
              class="save-btn"
              :disabled="isSaving"
            >
              <span v-if="isSaving" class="spinner" />
              <span v-else>변경 사항 저장</span>
            </button>
          </div>
        </form>

      </div>
    </div>
    </div>
  </AppLayout>
</template>

<style scoped>
/* ── 레이아웃 ──────────────────────────────────────────────────────── */
.profile-page {
  min-height: 100vh;
  background: #0d0d12;
  position: relative;
  overflow: hidden;
  padding: 48px 24px 80px;
  font-family: 'Inter', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
}
.bg-orb--1 {
  width: 560px;
  height: 560px;
  top: -160px;
  right: -140px;
  background: radial-gradient(circle, rgba(164, 147, 232, 0.16) 0%, transparent 65%);
}
.bg-orb--2 {
  width: 400px;
  height: 400px;
  bottom: -80px;
  left: -80px;
  background: radial-gradient(circle, rgba(100, 80, 200, 0.14) 0%, transparent 65%);
}

.profile-container {
  position: relative;
  z-index: 1;
  max-width: 680px;
  margin: 0 auto;
}

/* ── 페이지 헤더 ────────────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}
.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 13px;
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 6px 20px rgba(164, 147, 232, 0.3);
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #f0eeff;
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}
.page-subtitle {
  font-size: 13px;
  color: rgba(164, 147, 232, 0.6);
  margin: 0;
}

/* ── 로드/에러 상태 ─────────────────────────────────────────────────── */
.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(164, 147, 232, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  font-size: 14px;
}
.error-state { color: #f56565; }

/* ── 카드 ──────────────────────────────────────────────────────────── */
.profile-card {
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(164, 147, 232, 0.15);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 36px 36px 32px;
  box-shadow:
    0 0 0 1px rgba(164, 147, 232, 0.07),
    0 24px 64px rgba(0, 0, 0, 0.45);
  animation: card-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── 카드 헤더 및 읽기 모드 ─────────────────────────────────────────── */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(164, 147, 232, 0.15);
  padding-bottom: 14px;
}
.card-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #f0eeff;
  margin: 0;
}
.edit-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: rgba(164, 147, 232, 0.1);
  border: 1px solid rgba(164, 147, 232, 0.2);
  color: #a493e8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}
.edit-mode-btn:hover {
  background: rgba(164, 147, 232, 0.2);
  border-color: #a493e8;
  color: #fff;
}
.edit-icon {
  flex-shrink: 0;
}

/* ── 폼 ────────────────────────────────────────────────────────────── */
.profile-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── 섹션 ──────────────────────────────────────────────────────────── */
.form-section {
  border: 1px solid rgba(164, 147, 232, 0.13);
  border-radius: 13px;
  padding: 20px 20px 18px;
  margin: 0;
}
.section-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(164, 147, 232, 0.65);
  letter-spacing: 0.7px;
  text-transform: uppercase;
  padding: 0 4px;
  margin-bottom: 18px;
  float: none;
  width: auto;
}
.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(164, 147, 232, 0.35);
  flex-shrink: 0;
}
.legend-dot--accent {
  background: #a493e8;
  box-shadow: 0 0 6px rgba(164, 147, 232, 0.6);
}

/* ── 그리드 (읽기 전용 섹션) ────────────────────────────────────────── */
.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ── 필드 공통 ──────────────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 2px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(240, 238, 255, 0.5);
  letter-spacing: 0.2px;
  text-transform: uppercase;
}
.field-readonly {
  padding: 10px 14px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(164, 147, 232, 0.08);
  color: rgba(240, 238, 255, 0.7);
  font-size: 14px;
  min-height: 40px;
  display: flex;
  align-items: center;
  letter-spacing: 0.1px;
}
.field-input {
  height: 44px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(164, 147, 232, 0.2);
  background: rgba(255, 255, 255, 0.045);
  color: #f0eeff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
  font-family: inherit;
  width: 100%;
}
.field-input::placeholder { color: rgba(164, 147, 232, 0.3); }
.field-input:focus {
  border-color: #a493e8;
  background: rgba(164, 147, 232, 0.07);
  box-shadow: 0 0 0 3px rgba(164, 147, 232, 0.13);
}
.field-input:disabled { opacity: 0.5; cursor: not-allowed; }
.field-input.input--warn {
  border-color: rgba(245, 101, 101, 0.6);
  box-shadow: 0 0 0 3px rgba(245, 101, 101, 0.1);
}
.field-hint {
  font-size: 11px;
  color: #f5a520;
  margin: 0;
  padding: 0 2px;
}
.verify-error {
  color: #f56565 !important;
  margin-top: -4px;
}
.text-warn {
  color: #f56565 !important;
}

select.field-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a493e8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  cursor: pointer;
}
select.field-input:disabled {
  cursor: not-allowed;
}
select.field-input option {
  background: #1a1a24;
  color: #f0eeff;
}

/* ── 구분선 ────────────────────────────────────────────────────────── */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 8px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(164, 147, 232, 0.15);
}
.divider-label {
  font-size: 11px;
  color: rgba(164, 147, 232, 0.45);
  white-space: nowrap;
  letter-spacing: 0.3px;
}

/* ── 상태 배너 ──────────────────────────────────────────────────────── */
.status-banner {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  animation: banner-in 0.25s ease both;
}
@keyframes banner-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.banner--success {
  color: #48c78e;
  background: rgba(72, 199, 142, 0.09);
  border: 1px solid rgba(72, 199, 142, 0.22);
}
.banner--error {
  color: #f56565;
  background: rgba(245, 101, 101, 0.09);
  border: 1px solid rgba(245, 101, 101, 0.22);
}

/* ── 버튼 및 액션 ────────────────────────────────────────────────────── */
.form-actions {
  display: flex;
  justify-content: flex-end;
}
.gap-12 {
  gap: 12px;
}
.btn {
  height: 44px;
  padding: 0 24px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s, opacity 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  font-family: inherit;
}
.btn:active {
  transform: translateY(1px);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--primary {
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(164, 147, 232, 0.25);
}
.btn--primary:hover:not(:disabled) {
  opacity: 0.95;
}
.btn--secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(240, 238, 255, 0.7);
}
.btn--secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #f0eeff;
}

.save-btn {
  height: 44px;
  padding: 0 28px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
  box-shadow: 0 6px 20px rgba(164, 147, 232, 0.28);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
}
.save-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(164, 147, 232, 0.38);
}
.save-btn:active:not(:disabled) { transform: translateY(0); }
.save-btn:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }

/* ── 모달 레이아웃 ───────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.25s ease;
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: rgba(18, 18, 24, 0.95);
  border: 1px solid rgba(164, 147, 232, 0.2);
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  padding: 28px 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  animation: zoom-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes zoom-in {
  from { transform: scale(0.92); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.modal-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #a493e8;
}
.modal-icon {
  flex-shrink: 0;
}
.modal-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: #f0eeff;
}
.modal-close-btn {
  background: transparent;
  border: none;
  color: rgba(240, 238, 255, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
  transition: background-color 0.2s, color 0.2s;
}
.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f0eeff;
}
.modal-desc {
  font-size: 13px;
  color: rgba(240, 238, 255, 0.65);
  line-height: 1.5;
  margin: 0 0 20px 0;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

/* ── 스피너 ────────────────────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
.spinner--lg {
  width: 28px;
  height: 28px;
  border-color: rgba(164, 147, 232, 0.25);
  border-top-color: #a493e8;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 반응형 ────────────────────────────────────────────────────────── */
@media (max-width: 560px) {
  .profile-card { padding: 24px 18px 20px; }
  .fields-grid { grid-template-columns: 1fr; }
  .form-actions { justify-content: stretch; }
  .save-btn, .btn { width: 100%; }
  .modal-actions { flex-direction: column-reverse; }
}
</style>
