<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/authService'

const router = useRouter()

// ─── 폼 필드 ──────────────────────────────────────────────────────────────
const employeeId = ref('')
const password = ref('')

// ─── UI 상태 ──────────────────────────────────────────────────────────────
const isLoading = ref(false)
const loginStatus = ref<'idle' | 'error'>('idle')
const errorMessage = ref('')

// ─── 로그인 핸들러 ────────────────────────────────────────────────────────
async function handleLogin(): Promise<void> {
  if (!employeeId.value.trim() || !password.value) return

  isLoading.value = true
  loginStatus.value = 'idle'
  errorMessage.value = ''

  const loginResult = await authService.executeLogin(
    employeeId.value.trim(),
    password.value,
  )

  if (loginResult.success) {
    if (loginResult.lastWorkspaceId) {
      await router.push(`/workspaces/${loginResult.lastWorkspaceId}/dashboard`)
    } else {
      await router.push('/workspace')
    }
  } else {
    loginStatus.value = 'error'
    errorMessage.value = '사번 또는 비밀번호가 일치하지 않습니다.'
    password.value = ''
  }

  isLoading.value = false
}
</script>

<template>
  <div class="login-page">
    <!-- 배경 장식 -->
    <div class="bg-orb bg-orb--1" />
    <div class="bg-orb bg-orb--2" />
    <div class="bg-orb bg-orb--3" />

    <div class="login-card">
      <!-- 헤더 -->
      <div class="card-header">
        <div class="logo-mark">
          <span class="logo-icon">⬡</span>
        </div>
        <h1 class="card-title">DevBridge AX</h1>
        <p class="card-subtitle">기업 지식 동기화 플랫폼</p>
      </div>

      <!-- 로그인 폼 -->
      <form class="login-form" @submit.prevent="handleLogin">
        <!-- 사번 입력 -->
        <div class="field">
          <label class="field-label" for="employeeId">사번</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </span>
            <input
              id="employeeId"
              v-model="employeeId"
              type="text"
              class="field-input"
              placeholder="사번을 입력하세요"
              :disabled="isLoading"
              autocomplete="username"
            />
          </div>
        </div>

        <!-- 비밀번호 입력 -->
        <div class="field">
          <label class="field-label" for="password">비밀번호</label>
          <div class="input-wrapper">
            <span class="input-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="password"
              v-model="password"
              type="password"
              class="field-input"
              placeholder="비밀번호"
              :disabled="isLoading"
              autocomplete="current-password"
            />
          </div>
        </div>

        <!-- 에러 메시지 -->
        <div v-if="loginStatus === 'error'" class="error-banner">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {{ errorMessage }}
        </div>

        <!-- 로그인 버튼 -->
        <button
          id="login-submit-btn"
          type="submit"
          class="submit-btn"
          :disabled="isLoading || !employeeId.trim() || !password"
        >
          <span v-if="isLoading" class="spinner" />
          <span v-else>로그인</span>
        </button>

        <!-- 하단 링크 -->
        <div class="footer-links">
          <span class="footer-text">계정이 없으신가요?</span>
          <RouterLink id="signup-link" to="/signup" class="signup-link"
            >회원가입</RouterLink
          >
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* ── 레이아웃 ──────────────────────────────────────────────────────── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d0d12;
  position: relative;
  overflow: hidden;
  padding: 24px 16px;
  font-family:
    'Inter',
    'Pretendard',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

/* 배경 장식 구체 */
.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  animation: float 8s ease-in-out infinite;
}
.bg-orb--1 {
  width: 500px;
  height: 500px;
  top: -160px;
  right: -120px;
  background: radial-gradient(
    circle,
    rgba(164, 147, 232, 0.22) 0%,
    transparent 65%
  );
  animation-delay: 0s;
}
.bg-orb--2 {
  width: 400px;
  height: 400px;
  bottom: -100px;
  left: -100px;
  background: radial-gradient(
    circle,
    rgba(100, 80, 200, 0.18) 0%,
    transparent 65%
  );
  animation-delay: -3s;
}
.bg-orb--3 {
  width: 280px;
  height: 280px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(164, 147, 232, 0.06) 0%,
    transparent 70%
  );
  animation-delay: -6s;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}
.bg-orb--3 {
  animation: float3 8s ease-in-out infinite;
  animation-delay: -6s;
}
@keyframes float3 {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, calc(-50% - 12px)) scale(1.04);
  }
}

/* ── 카드 ──────────────────────────────────────────────────────────── */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(164, 147, 232, 0.16);
  border-radius: 24px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 44px 40px 40px;
  box-shadow:
    0 0 0 1px rgba(164, 147, 232, 0.07),
    0 32px 80px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  animation: card-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ── 헤더 ──────────────────────────────────────────────────────────── */
.card-header {
  text-align: center;
  margin-bottom: 36px;
}
.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  margin-bottom: 18px;
  box-shadow:
    0 8px 28px rgba(164, 147, 232, 0.38),
    0 0 0 1px rgba(164, 147, 232, 0.2);
  animation: logo-pulse 3s ease-in-out infinite;
}
@keyframes logo-pulse {
  0%,
  100% {
    box-shadow:
      0 8px 28px rgba(164, 147, 232, 0.38),
      0 0 0 1px rgba(164, 147, 232, 0.2);
  }
  50% {
    box-shadow:
      0 8px 40px rgba(164, 147, 232, 0.55),
      0 0 0 1px rgba(164, 147, 232, 0.35);
  }
}
.logo-icon {
  font-size: 26px;
  color: #fff;
  line-height: 1;
}
.card-title {
  font-size: 24px;
  font-weight: 700;
  color: #f0eeff;
  margin: 0 0 6px;
  letter-spacing: -0.4px;
}
.card-subtitle {
  font-size: 13px;
  color: rgba(164, 147, 232, 0.6);
  margin: 0;
  letter-spacing: 0.1px;
}

/* ── 폼 ────────────────────────────────────────────────────────────── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(240, 238, 255, 0.55);
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

/* ── 입력 필드 ─────────────────────────────────────────────────────── */
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: 14px;
  color: rgba(164, 147, 232, 0.45);
  display: flex;
  align-items: center;
  pointer-events: none;
  transition: color 0.2s ease;
}
.field-input {
  width: 100%;
  height: 46px;
  padding: 0 14px 0 42px;
  border-radius: 11px;
  border: 1px solid rgba(164, 147, 232, 0.18);
  background: rgba(255, 255, 255, 0.04);
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
  color: rgba(164, 147, 232, 0.3);
}
.field-input:focus {
  border-color: #a493e8;
  background: rgba(164, 147, 232, 0.07);
  box-shadow: 0 0 0 3px rgba(164, 147, 232, 0.14);
}
.field-input:focus + .input-icon,
.input-wrapper:focus-within .input-icon {
  color: #a493e8;
}
.field-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── 에러 배너 ─────────────────────────────────────────────────────── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 9px;
  background: rgba(245, 101, 101, 0.1);
  border: 1px solid rgba(245, 101, 101, 0.22);
  color: #f56565;
  font-size: 13px;
  font-weight: 500;
  animation: shake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
@keyframes shake {
  10%,
  90% {
    transform: translateX(-2px);
  }
  20%,
  80% {
    transform: translateX(3px);
  }
  30%,
  50%,
  70% {
    transform: translateX(-3px);
  }
  40%,
  60% {
    transform: translateX(3px);
  }
}

/* ── 제출 버튼 ─────────────────────────────────────────────────────── */
.submit-btn {
  width: 100%;
  height: 50px;
  border-radius: 13px;
  border: none;
  background: linear-gradient(135deg, #a493e8 0%, #7b68c8 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.3px;
  cursor: pointer;
  margin-top: 4px;
  transition:
    opacity 0.2s ease,
    transform 0.15s ease,
    box-shadow 0.2s ease;
  box-shadow: 0 6px 22px rgba(164, 147, 232, 0.32);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  position: relative;
  overflow: hidden;
}
.submit-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    transparent 60%
  );
  pointer-events: none;
}
.submit-btn:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(164, 147, 232, 0.42);
}
.submit-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(164, 147, 232, 0.25);
}
.submit-btn:disabled {
  opacity: 0.32;
  cursor: not-allowed;
  box-shadow: none;
}

/* ── 하단 링크 ─────────────────────────────────────────────────────── */
.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
.footer-text {
  font-size: 13px;
  color: rgba(240, 238, 255, 0.38);
}
.signup-link {
  font-size: 13px;
  font-weight: 600;
  color: #a493e8;
  text-decoration: none;
  transition: color 0.2s ease;
  position: relative;
}
.signup-link::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 0;
  height: 1px;
  background: #a493e8;
  transition: width 0.2s ease;
}
.signup-link:hover {
  color: #c4b8f4;
}
.signup-link:hover::after {
  width: 100%;
}

/* ── 스피너 ────────────────────────────────────────────────────────── */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── 반응형 ────────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px 28px;
    border-radius: 18px;
  }
}
</style>
