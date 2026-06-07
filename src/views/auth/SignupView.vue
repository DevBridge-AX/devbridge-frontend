<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/authService'

const router = useRouter()

// ─── 폼 필드 ──────────────────────────────────────────────────────────────
const name = ref('')
const employeeId = ref('')
const email = ref('')
const authCode = ref('')
const password = ref('')
const passwordConfirm = ref('')

// ─── 단계별 상태 ──────────────────────────────────────────────────────────
const isHrVerified = ref(false)
const isEmailVerified = ref(false)

const hrStatus = ref<'idle' | 'success' | 'error'>('idle')
const hrMessage = ref('')

const emailSendStatus = ref<'idle' | 'sent' | 'error'>('error') // 이메일 발송 상태
const emailCodeStatus = ref<'idle' | 'success' | 'error'>('idle')
const emailCodeMessage = ref('')

const submitStatus = ref<'idle' | 'loading' | 'error'>('idle')
const submitMessage = ref('')

// ─── 로딩 상태 ───────────────────────────────────────────────────────────
const isHrLoading = ref(false)
const isEmailSending = ref(false)
const isCodeVerifying = ref(false)
const isSubmitting = ref(false)

// ─── computed: 최종 가입 버튼 활성화 조건 ────────────────────────────────
const canSubmit = computed(
  () =>
    name.value.trim() !== '' &&
    isHrVerified.value &&
    isEmailVerified.value &&
    password.value.length >= 8 &&
    password.value === passwordConfirm.value,
)

const passwordMismatch = computed(
  () => passwordConfirm.value !== '' && password.value !== passwordConfirm.value,
)

// ─── Step 3: HR 직원 검증 ────────────────────────────────────────────────
async function handleVerifyEmployee(): Promise<void> {
  if (!name.value.trim() || !employeeId.value.trim()) return
  isHrLoading.value = true
  hrStatus.value = 'idle'
  try {
    const ok = await authService.verifyEmployee(employeeId.value.trim(), name.value.trim())
    if (ok) {
      hrStatus.value = 'success'
      hrMessage.value = '✓ HR 검증이 완료되었습니다.'
      isHrVerified.value = true
    } else {
      hrStatus.value = 'error'
      hrMessage.value = '✗ 등록된 직원 정보를 찾을 수 없습니다.'
      isHrVerified.value = false
    }
  } catch {
    hrStatus.value = 'error'
    hrMessage.value = '✗ 검증 중 오류가 발생했습니다. 다시 시도해 주세요.'
    isHrVerified.value = false
  } finally {
    isHrLoading.value = false
  }
}

// ─── Step 4: 이메일 인증 코드 발송 ──────────────────────────────────────
async function handleSendEmail(): Promise<void> {
  if (!email.value.trim()) return
  isEmailSending.value = true
  emailSendStatus.value = 'error'
  try {
    await authService.sendAuthEmail(email.value.trim())
    emailSendStatus.value = 'sent'
    emailCodeStatus.value = 'idle'
    emailCodeMessage.value = ''
    isEmailVerified.value = false
  } catch {
    emailSendStatus.value = 'error'
  } finally {
    isEmailSending.value = false
  }
}

// ─── Step 6: 인증 코드 검증 ─────────────────────────────────────────────
async function handleVerifyCode(): Promise<void> {
  if (!authCode.value.trim()) return
  isCodeVerifying.value = true
  emailCodeStatus.value = 'idle'
  try {
    await authService.verifyAuthEmail(email.value.trim(), authCode.value.trim())
    emailCodeStatus.value = 'success'
    emailCodeMessage.value = '✓ 이메일 인증이 완료되었습니다.'
    isEmailVerified.value = true
  } catch {
    emailCodeStatus.value = 'error'
    emailCodeMessage.value = '✗ 인증 코드가 올바르지 않습니다. 다시 확인해 주세요.'
    isEmailVerified.value = false
  } finally {
    isCodeVerifying.value = false
  }
}

// ─── Step 7: 최종 회원가입 ──────────────────────────────────────────────
async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return
  isSubmitting.value = true
  submitStatus.value = 'idle'
  try {
    await authService.registerUser(employeeId.value.trim(), email.value.trim(), password.value)
    await router.push('/login')
  } catch {
    submitStatus.value = 'error'
    submitMessage.value = '✗ 회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="signup-page">
    <!-- 배경 장식 -->
    <div class="bg-orb bg-orb--1" />
    <div class="bg-orb bg-orb--2" />

    <div class="signup-card">
      <!-- 헤더 -->
      <div class="card-header">
        <div class="logo-mark">
          <span class="logo-icon">⬡</span>
        </div>
        <h1 class="card-title">DevBridge AX</h1>
        <p class="card-subtitle">신규 계정 등록</p>
      </div>

      <form class="signup-form" @submit.prevent="handleSubmit">

        <!-- ── Step 1·2: 이름 / 사번 ─────────────────────────────── -->
        <fieldset class="form-section">
          <legend class="section-label">
            <span class="step-badge">1</span> 직원 정보 입력
          </legend>

          <div class="field-row">
            <div class="field">
              <label class="field-label" for="name">이름</label>
              <input
                id="name"
                v-model="name"
                type="text"
                class="field-input"
                placeholder="홍길동"
                :disabled="isHrVerified"
                autocomplete="name"
              />
            </div>

            <div class="field">
              <label class="field-label" for="employeeId">사번</label>
              <div class="input-with-btn">
                <input
                  id="employeeId"
                  v-model="employeeId"
                  type="text"
                  class="field-input"
                  placeholder="EMP-00000"
                  :disabled="isHrVerified"
                  :readonly="isHrVerified"
                  autocomplete="off"
                />
                <!-- Step 3: 검증 버튼 -->
                <button
                  type="button"
                  class="action-btn"
                  :disabled="isHrVerified || isHrLoading || !name.trim() || !employeeId.trim()"
                  :class="{ 'btn--verified': isHrVerified }"
                  @click="handleVerifyEmployee"
                >
                  <span v-if="isHrLoading" class="spinner" />
                  <span v-else-if="isHrVerified">검증됨</span>
                  <span v-else>검증</span>
                </button>
              </div>
            </div>
          </div>

          <!-- HR 검증 메시지 -->
          <p
            v-if="hrStatus !== 'idle'"
            class="status-msg"
            :class="hrStatus === 'success' ? 'msg--success' : 'msg--error'"
          >
            {{ hrMessage }}
          </p>
        </fieldset>

        <!-- ── Step 4·5·6: 이메일 인증 ───────────────────────────── -->
        <fieldset class="form-section" :class="{ 'section--disabled': !isHrVerified }">
          <legend class="section-label">
            <span class="step-badge">2</span> 이메일 인증
          </legend>

          <div class="input-with-btn">
            <input
              id="email"
              v-model="email"
              type="email"
              class="field-input"
              placeholder="example@company.com"
              :disabled="!isHrVerified || isEmailVerified"
              :readonly="isEmailVerified"
              autocomplete="email"
            />
            <button
              type="button"
              class="action-btn"
              :disabled="!isHrVerified || isEmailSending || !email.trim() || isEmailVerified"
              @click="handleSendEmail"
            >
              <span v-if="isEmailSending" class="spinner" />
              <span v-else-if="emailSendStatus === 'sent'">재발송</span>
              <span v-else>코드 발송</span>
            </button>
          </div>

          <!-- 코드 발송 완료 안내 -->
          <p v-if="emailSendStatus === 'sent'" class="hint-msg">
            📧 인증 코드가 발송되었습니다. 이메일을 확인해 주세요.
          </p>

          <!-- Step 5: 인증 코드 입력 -->
          <div class="input-with-btn" style="margin-top: 10px;">
            <input
              id="authCode"
              v-model="authCode"
              type="text"
              class="field-input code-input"
              placeholder="6자리 코드 입력"
              maxlength="6"
              :disabled="!isHrVerified || emailSendStatus !== 'sent' || isEmailVerified"
              :readonly="isEmailVerified"
              autocomplete="one-time-code"
            />
            <!-- Step 6: 코드 검증 버튼 -->
            <button
              type="button"
              class="action-btn"
              :disabled="
                !isHrVerified ||
                emailSendStatus !== 'sent' ||
                isEmailVerified ||
                isCodeVerifying ||
                authCode.trim().length !== 6
              "
              :class="{ 'btn--verified': isEmailVerified }"
              @click="handleVerifyCode"
            >
              <span v-if="isCodeVerifying" class="spinner" />
              <span v-else-if="isEmailVerified">인증됨</span>
              <span v-else>코드 확인</span>
            </button>
          </div>

          <!-- 코드 검증 메시지 -->
          <p
            v-if="emailCodeStatus !== 'idle'"
            class="status-msg"
            :class="emailCodeStatus === 'success' ? 'msg--success' : 'msg--error'"
          >
            {{ emailCodeMessage }}
          </p>
        </fieldset>

        <!-- ── 비밀번호 ────────────────────────────────────────────── -->
        <fieldset class="form-section" :class="{ 'section--disabled': !isEmailVerified }">
          <legend class="section-label">
            <span class="step-badge">3</span> 비밀번호 설정
          </legend>

          <div class="field">
            <label class="field-label" for="password">비밀번호</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="field-input"
              placeholder="8자 이상 입력"
              :disabled="!isEmailVerified"
              autocomplete="new-password"
            />
          </div>

          <div class="field" style="margin-top: 10px;">
            <label class="field-label" for="passwordConfirm">비밀번호 확인</label>
            <input
              id="passwordConfirm"
              v-model="passwordConfirm"
              type="password"
              class="field-input"
              :class="{ 'input--error': passwordMismatch }"
              placeholder="비밀번호 재입력"
              :disabled="!isEmailVerified"
              autocomplete="new-password"
            />
            <p v-if="passwordMismatch" class="status-msg msg--error">
              ✗ 비밀번호가 일치하지 않습니다.
            </p>
          </div>
        </fieldset>

        <!-- ── Step 7: 최종 가입 버튼 ─────────────────────────────── -->
        <button
          type="submit"
          class="submit-btn"
          :disabled="!canSubmit || isSubmitting"
        >
          <span v-if="isSubmitting" class="spinner spinner--white" />
          <span v-else>최종 가입 완료</span>
        </button>

        <!-- 제출 에러 메시지 -->
        <p v-if="submitStatus === 'error'" class="status-msg msg--error" style="text-align:center;">
          {{ submitMessage }}
        </p>

        <!-- 로그인으로 이동 -->
        <p class="login-link">
          이미 계정이 있으신가요?
          <RouterLink to="/login">로그인</RouterLink>
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* ── 레이아웃 ──────────────────────────────────────────────────────── */
.signup-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d0d12;
  position: relative;
  overflow: hidden;
  padding: 40px 16px;
  font-family: 'Inter', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* 배경 장식 구체 */
.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.bg-orb--1 {
  width: 480px;
  height: 480px;
  top: -120px;
  right: -100px;
  background: radial-gradient(circle, rgba(164, 147, 232, 0.25) 0%, transparent 70%);
}
.bg-orb--2 {
  width: 360px;
  height: 360px;
  bottom: -80px;
  left: -80px;
  background: radial-gradient(circle, rgba(100, 80, 200, 0.2) 0%, transparent 70%);
}

/* ── 카드 ──────────────────────────────────────────────────────────── */
.signup-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 520px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(164, 147, 232, 0.18);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  padding: 40px 40px 36px;
  box-shadow:
    0 0 0 1px rgba(164, 147, 232, 0.08),
    0 24px 64px rgba(0, 0, 0, 0.5);
}

/* ── 헤더 ──────────────────────────────────────────────────────────── */
.card-header {
  text-align: center;
  margin-bottom: 32px;
}
.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  margin-bottom: 16px;
  box-shadow: 0 8px 24px rgba(164, 147, 232, 0.35);
}
.logo-icon {
  font-size: 24px;
  color: #fff;
}
.card-title {
  font-size: 22px;
  font-weight: 700;
  color: #f0eeff;
  margin: 0 0 6px;
  letter-spacing: -0.3px;
}
.card-subtitle {
  font-size: 13px;
  color: rgba(164, 147, 232, 0.7);
  margin: 0;
}

/* ── 폼 섹션 ───────────────────────────────────────────────────────── */
.signup-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  border: 1px solid rgba(164, 147, 232, 0.15);
  border-radius: 12px;
  padding: 18px 18px 16px;
  margin: 0;
  transition: opacity 0.25s ease, border-color 0.25s ease;
}
.form-section:not(.section--disabled) {
  border-color: rgba(164, 147, 232, 0.22);
}
.form-section.section--disabled {
  opacity: 0.4;
  pointer-events: none;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #a493e8;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  margin-bottom: 14px;
  float: none;
  width: auto;
}
.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(164, 147, 232, 0.25);
  color: #a493e8;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ── 필드 ──────────────────────────────────────────────────────────── */
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(240, 238, 255, 0.6);
  letter-spacing: 0.2px;
}

.field-input {
  width: 100%;
  height: 40px;
  padding: 0 14px;
  border-radius: 9px;
  border: 1px solid rgba(164, 147, 232, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #f0eeff;
  font-size: 14px;
  outline: none;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
  box-sizing: border-box;
  font-family: inherit;
}
.field-input::placeholder {
  color: rgba(164, 147, 232, 0.35);
}
.field-input:focus {
  border-color: #a493e8;
  background: rgba(164, 147, 232, 0.08);
  box-shadow: 0 0 0 3px rgba(164, 147, 232, 0.15);
}
.field-input:disabled,
.field-input[readonly] {
  opacity: 0.55;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.02);
}
.field-input.input--error {
  border-color: #f56565;
  box-shadow: 0 0 0 3px rgba(245, 101, 101, 0.15);
}

.code-input {
  letter-spacing: 6px;
  font-weight: 600;
  text-align: center;
}

/* ── 입력 + 버튼 묶음 ─────────────────────────────────────────────── */
.input-with-btn {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.input-with-btn .field-input {
  flex: 1;
}

/* ── 액션 버튼 ─────────────────────────────────────────────────────── */
.action-btn {
  flex-shrink: 0;
  height: 40px;
  padding: 0 16px;
  border-radius: 9px;
  border: 1px solid rgba(164, 147, 232, 0.4);
  background: rgba(164, 147, 232, 0.12);
  color: #a493e8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: inherit;
}
.action-btn:hover:not(:disabled) {
  background: rgba(164, 147, 232, 0.22);
  border-color: #a493e8;
}
.action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.action-btn.btn--verified {
  background: rgba(72, 199, 142, 0.12);
  border-color: rgba(72, 199, 142, 0.4);
  color: #48c78e;
}

/* ── 제출 버튼 ─────────────────────────────────────────────────────── */
.submit-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    transform 0.15s ease,
    box-shadow 0.2s ease;
  box-shadow: 0 6px 20px rgba(164, 147, 232, 0.3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  font-family: inherit;
}
.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 10px 28px rgba(164, 147, 232, 0.4);
}
.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}
.submit-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
}

/* ── 상태 메시지 ──────────────────────────────────────────────────── */
.status-msg {
  font-size: 12px;
  font-weight: 500;
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: 7px;
}
.msg--success {
  color: #48c78e;
  background: rgba(72, 199, 142, 0.1);
  border: 1px solid rgba(72, 199, 142, 0.2);
}
.msg--error {
  color: #f56565;
  background: rgba(245, 101, 101, 0.1);
  border: 1px solid rgba(245, 101, 101, 0.2);
}
.hint-msg {
  font-size: 12px;
  color: rgba(164, 147, 232, 0.65);
  margin: 10px 0 0;
  padding: 0 2px;
}

/* ── 로그인 링크 ──────────────────────────────────────────────────── */
.login-link {
  text-align: center;
  font-size: 13px;
  color: rgba(240, 238, 255, 0.45);
  margin: 4px 0 0;
}
.login-link a {
  color: #a493e8;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}
.login-link a:hover {
  color: #c4b8f4;
  text-decoration: underline;
}

/* ── 스피너 ────────────────────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(164, 147, 232, 0.35);
  border-top-color: #a493e8;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.spinner--white {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 반응형 ────────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .signup-card {
    padding: 28px 20px 24px;
  }
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
