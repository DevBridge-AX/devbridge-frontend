<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { settingService } from '@/services/settingService'
import type { UserProfile } from '@/api/settingApi'

// ─── 프로필 데이터 ─────────────────────────────────────────────────────────
const profile = ref<UserProfile | null>(null)
const isLoadingProfile = ref(true)
const loadError = ref('')

// ─── 편집 폼 필드 ──────────────────────────────────────────────────────────
const editName = ref('')
const currentPassword = ref('')
const newPassword = ref('')

// ─── 저장 상태 ────────────────────────────────────────────────────────────
const isSaving = ref(false)
const saveStatus = ref<'idle' | 'success' | 'error'>('idle')
const saveMessage = ref('')

// ─── 마운트 시 프로필 로드 ─────────────────────────────────────────────────
onMounted(async () => {
  try {
    profile.value = await settingService.getProfile()
    editName.value = profile.value.name
  } catch {
    loadError.value = '프로필 정보를 불러오지 못했습니다. 페이지를 새로고침해 주세요.'
  } finally {
    isLoadingProfile.value = false
  }
})

// ─── 저장 핸들러 ──────────────────────────────────────────────────────────
async function handleSave(): Promise<void> {
  saveStatus.value = 'idle'

  // 클라이언트 사전 검증: 새 비밀번호 길이
  if (newPassword.value && newPassword.value.length < 8) {
    saveStatus.value = 'error'
    saveMessage.value = '새 비밀번호는 8자 이상이어야 합니다.'
    return
  }

  // 새 비밀번호 입력 시 현재 비밀번호 필수
  if (newPassword.value && !currentPassword.value) {
    saveStatus.value = 'error'
    saveMessage.value = '비밀번호를 변경하려면 현재 비밀번호를 입력해 주세요.'
    return
  }

  isSaving.value = true

  try {
    const payload: { name?: string; currentPassword?: string; newPassword?: string } = {}

    if (editName.value.trim() && editName.value.trim() !== profile.value?.name) {
      payload.name = editName.value.trim()
    }
    if (currentPassword.value) payload.currentPassword = currentPassword.value
    if (newPassword.value) payload.newPassword = newPassword.value

    await settingService.modifyProfile(payload)

    // 성공 처리
    if (profile.value && payload.name) {
      profile.value = { ...profile.value, name: payload.name }
    }
    saveStatus.value = 'success'
    saveMessage.value = '프로필이 성공적으로 업데이트되었습니다.'
    currentPassword.value = ''
    newPassword.value = ''
  } catch (e: unknown) {
    saveStatus.value = 'error'
    saveMessage.value = e instanceof Error ? e.message : '프로필 수정에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
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

        <!-- ── 프로필 이미지 업로드 영역 (향후 확장) ──────────────────────
        <div class="avatar-section">
          <div class="avatar-wrapper">
            <div class="avatar-placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <button class="avatar-upload-btn" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              사진 변경
            </button>
          </div>
        </div>
        ─────────────────────────────────────────────────────────────────── -->

        <form class="profile-form" @submit.prevent="handleSave">

          <!-- ── Section 1: 읽기 전용 정보 ─────────────────────────── -->
          <fieldset class="form-section">
            <legend class="section-legend">
              <span class="legend-dot" />
              계정 정보 <span class="legend-badge">읽기 전용</span>
            </legend>

            <div class="fields-grid">
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
            </div>
          </fieldset>

          <!-- ── Section 2: 수정 가능 정보 ─────────────────────────── -->
          <fieldset class="form-section">
            <legend class="section-legend">
              <span class="legend-dot legend-dot--accent" />
              수정 가능 정보
            </legend>

            <!-- 이름 -->
            <div class="field">
              <label class="field-label" for="edit-name">이름</label>
              <input
                id="edit-name"
                v-model="editName"
                type="text"
                class="field-input"
                placeholder="이름을 입력하세요"
                :disabled="isSaving"
                autocomplete="name"
              />
            </div>

            <!-- 구분선 -->
            <div class="divider">
              <span class="divider-label">비밀번호 변경 (선택)</span>
            </div>

            <!-- 현재 비밀번호 -->
            <div class="field">
              <label class="field-label" for="current-password">현재 비밀번호</label>
              <input
                id="current-password"
                v-model="currentPassword"
                type="password"
                class="field-input"
                placeholder="현재 비밀번호 입력"
                :disabled="isSaving"
                autocomplete="current-password"
              />
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
                placeholder="새 비밀번호 (8자 이상)"
                :disabled="isSaving"
                autocomplete="new-password"
              />
              <p v-if="newPassword && newPassword.length < 8" class="field-hint">
                비밀번호는 8자 이상이어야 합니다.
              </p>
            </div>
          </fieldset>

          <!-- ── 저장 결과 메시지 ───────────────────────────────────── -->
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

          <!-- ── 저장 버튼 ──────────────────────────────────────────── -->
          <div class="form-actions">
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
.legend-badge {
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(164, 147, 232, 0.1);
  border: 1px solid rgba(164, 147, 232, 0.2);
  color: rgba(164, 147, 232, 0.7);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

/* ── 그리드 (읽기 전용 섹션) ────────────────────────────────────────── */
.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
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
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(164, 147, 232, 0.1);
  color: rgba(240, 238, 255, 0.6);
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
  border-color: rgba(245, 165, 32, 0.6);
  box-shadow: 0 0 0 3px rgba(245, 165, 32, 0.1);
}
.field-hint {
  font-size: 11px;
  color: #f5a520;
  margin: 0;
  padding: 0 2px;
}

/* ── 구분선 ────────────────────────────────────────────────────────── */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 4px;
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

/* ── 저장 버튼 ──────────────────────────────────────────────────────── */
.form-actions {
  display: flex;
  justify-content: flex-end;
}
.save-btn {
  height: 46px;
  padding: 0 32px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
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
  .save-btn { width: 100%; }
}
</style>
