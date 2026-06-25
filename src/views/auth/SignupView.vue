<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import { authService } from '@/services/authService'
import BrandLogo from '@/components/common/BrandLogo.vue'

const router = useRouter()

// ─── 폼 필드 ──────────────────────────────────────────────────────────────
const name = ref('')
const employeeId = ref('')
const email = ref('')
const authCode = ref('')
const password = ref('')
const passwordConfirm = ref('')
const jobRole = ref('')

const JOB_ROLE_OPTIONS = [
  { value: 'PLANNER', label: '기획자' },
  { value: 'DEVELOPER', label: '개발자' },
  { value: 'QA', label: 'QA' },
  { value: 'DESIGNER', label: '디자이너' },
  { value: 'OPERATOR', label: '운영자' },
  { value: 'NEWCOMER', label: '신규투입자' },
] as const

// ─── 단계별 상태 ──────────────────────────────────────────────────────────
const isHrVerified = ref(false)
const isEmailVerified = ref(false)

// HR 검증 완료 후 확정된 사번 (이메일 발송 payload에 재사용)
const verifiedEmployeeId = ref('')

const hrStatus = ref<'idle' | 'success' | 'error'>('idle')
const hrMessage = ref('')

const emailSendStatus = ref<'idle' | 'sent' | 'error'>('idle') // 이메일 발송 상태
const emailSendMessage = ref('')
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
    password.value === passwordConfirm.value &&
    jobRole.value !== '',
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
      verifiedEmployeeId.value = employeeId.value.trim()
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
  if (!email.value.trim() || !verifiedEmployeeId.value) return
  isEmailSending.value = true
  emailSendStatus.value = 'idle'
  emailSendMessage.value = ''
  try {
    await authService.sendAuthEmail(verifiedEmployeeId.value, email.value.trim())
    emailSendStatus.value = 'sent'
    emailCodeStatus.value = 'idle'
    emailCodeMessage.value = ''
    isEmailVerified.value = false
  } catch (err: unknown) {
    emailSendStatus.value = 'error'
    if (isAxiosError(err) && err.response?.status === 400) {
      emailSendMessage.value = '✗ 인사 DB에 등록된 이메일과 일치하지 않습니다. 다시 확인해주세요.'
    } else {
      emailSendMessage.value = '✗ 이메일 발송 중 오류가 발생했습니다. 다시 시도해 주세요.'
    }
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
    await authService.registerUser(employeeId.value.trim(), email.value.trim(), password.value, jobRole.value)
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
        <BrandLogo variant="light" size="lg" compact style="margin:0 auto 14px" />
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

          <!-- 코드 발송 에러 안내 -->
          <p v-if="emailSendStatus === 'error' && emailSendMessage" class="status-msg msg--error">
            {{ emailSendMessage }}
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

        <!-- ── Step 4: 직무 선택 ──────────────────────────────────── -->
        <fieldset class="form-section" :class="{ 'section--disabled': !isEmailVerified }">
          <legend class="section-label">
            <span class="step-badge">4</span> 직무 선택
          </legend>

          <div class="field">
            <label class="field-label" for="jobRole">직무</label>
            <select
              id="jobRole"
              v-model="jobRole"
              class="field-input"
              :class="{ 'input--error': isEmailVerified && jobRole === '' && password.length >= 8 }"
              :disabled="!isEmailVerified"
            >
              <option value="" disabled>직무를 선택해 주세요</option>
              <option v-for="opt in JOB_ROLE_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <p
              v-if="isEmailVerified && jobRole === '' && password.length >= 8"
              class="status-msg msg--error"
            >
              직무를 선택해 주세요.
            </p>
          </div>
        </fieldset>

        <!-- ── Step 5: 최종 가입 버튼 ─────────────────────────────── -->
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
/* ══ Signup (Dashboard Unified) ══ */
.signup-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--page-bg, #F6F7FB); padding: 40px 16px;
}
.signup-card {
  width: 100%; max-width: 520px;
  background: var(--card-bg, #fff); border: 1px solid var(--card-border, #E8EAF2);
  border-radius: 16px; padding: 36px 36px 32px;
}
.card-header { text-align: center; margin-bottom: 28px; }
.logo-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 48px; height: 48px; border-radius: 12px;
  background: var(--brand-gradient, linear-gradient(135deg,#6C63FF,#5B52E3));
  margin-bottom: 14px; box-shadow: 0 6px 20px rgba(91,82,227,.25);
}
.logo-icon { font-size: 22px; color: #fff; line-height: 1; }
.card-title { font-size: 20px; font-weight: 700; color: var(--text-body, #1B2031); margin: 0 0 4px; }
.card-subtitle { font-size: 13px; color: var(--text-secondary, #6B7191); margin: 0; }

.signup-form { display: flex; flex-direction: column; gap: 18px; }
.form-section {
  border: 1px solid var(--card-border, #E8EAF2); border-radius: 12px;
  padding: 16px 16px 14px; margin: 0;
}
.form-section.section--disabled { opacity: .4; pointer-events: none; }
.section-label {
  font-size: 10px; font-weight: 700; color: var(--text-light, #9AA0BD);
  letter-spacing: .6px; text-transform: uppercase;
  display: flex; align-items: center; gap: 6px; margin-bottom: 12px;
}
.step-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--brand-light, #F0F2FE); color: var(--brand-indigo, #5B52E3);
  font-size: 10px; font-weight: 700; flex-shrink: 0;
}
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--text-secondary, #6B7191); }
.field-input {
  width: 100%; height: 42px; padding: 0 12px; border-radius: 9px;
  border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff); color: var(--text-body, #1B2031);
  font-family: var(--font-ui); font-size: 13px; outline: none;
  transition: border-color .15s; box-sizing: border-box;
}
.field-input::placeholder { color: var(--text-light, #9AA0BD); }
.field-input:focus { border-color: var(--brand-indigo, #5B52E3); box-shadow: 0 0 0 3px rgba(91,82,227,.1); }
.field-input:disabled, .field-input[readonly] { opacity: .5; cursor: not-allowed; background: var(--page-bg, #F6F7FB); }
.field-input.input--error { border-color: var(--danger-text, #D45D5D); box-shadow: 0 0 0 3px rgba(212,93,93,.1); }
.code-input { letter-spacing: 6px; font-weight: 600; text-align: center; }
select.field-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239AA0BD' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; cursor: pointer; }

.input-with-btn { display: flex; gap: 8px; align-items: stretch; }
.input-with-btn .field-input { flex: 1; }
.action-btn {
  flex-shrink: 0; height: 42px; padding: 0 16px; border-radius: 9px;
  border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff); color: var(--brand-indigo, #5B52E3);
  font-family: var(--font-ui); font-size: 13px; font-weight: 600; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: all .12s;
}
.action-btn:hover:not(:disabled) { border-color: var(--brand-indigo, #5B52E3); background: var(--brand-light, #F0F2FE); }
.action-btn:disabled { opacity: .35; cursor: not-allowed; }
.action-btn.btn--verified { border-color: #15803d; color: #15803d; background: #dcfce7; }

.submit-btn {
  width: 100%; height: 48px; border-radius: 12px; border: 0;
  background: var(--brand-indigo, #5B52E3); color: #fff;
  font-family: var(--font-ui); font-size: 15px; font-weight: 700; cursor: pointer;
  transition: all .15s; box-shadow: 0 4px 16px rgba(91,82,227,.25);
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 4px;
}
.submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(91,82,227,.35); }
.submit-btn:active:not(:disabled) { transform: translateY(0); }
.submit-btn:disabled { opacity: .35; cursor: not-allowed; box-shadow: none; }

.status-msg { font-size: 12px; font-weight: 500; margin: 8px 0 0; padding: 8px 12px; border-radius: 7px; }
.msg--success { color: #15803d; background: #dcfce7; border: 1px solid rgba(21,128,61,.2); }
.msg--error { color: var(--danger-text, #D45D5D); background: var(--danger-bg, #FBF0F0); border: 1px solid rgba(212,93,93,.2); }
.hint-msg { font-size: 11px; color: var(--text-light, #9AA0BD); margin: 8px 0 0; }

.login-link { text-align: center; font-size: 13px; color: var(--text-secondary, #6B7191); margin: 4px 0 0; }
.login-link a { color: var(--brand-indigo, #5B52E3); text-decoration: none; font-weight: 600; }
.login-link a:hover { text-decoration: underline; }

.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .65s linear infinite; }
.spinner--white { border-color: rgba(255,255,255,.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width:480px) { .signup-card { padding: 24px 18px; } .field-row { grid-template-columns: 1fr; } }
</style>
