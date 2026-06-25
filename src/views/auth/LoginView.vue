<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/authService'
import BrandLogo from '@/components/common/BrandLogo.vue'

const router = useRouter()

const employeeId = ref('')
const password = ref('')
const isLoading = ref(false)
const loginStatus = ref<'idle' | 'error'>('idle')
const errorMessage = ref('')

async function handleLogin(): Promise<void> {
  if (!employeeId.value.trim() || !password.value) return
  isLoading.value = true
  loginStatus.value = 'idle'
  errorMessage.value = ''

  const loginResult = await authService.executeLogin(
    employeeId.value.trim(), password.value,
  )
  if (loginResult.success) {
    await router.push(loginResult.lastWorkspaceId
      ? `/workspaces/${loginResult.lastWorkspaceId}/dashboard`
      : '/workspace')
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
    <!-- ══ LEFT: Branding Panel ══ -->
    <section class="login-brand">
      <div class="brand-top">
        <BrandLogo variant="dark" size="md" show-subtitle />
      </div>

      <div class="brand-body">
        <div class="brand-pills">
          <span class="brand-pill">Enterprise Knowledge OS</span>
          <span class="brand-pill brand-pill--green">실시간 동기화</span>
        </div>
        <h1 class="brand-headline">문서 · Git · AI 분석을<br>하나의 업무 흐름으로.</h1>
        <p class="brand-desc">DevBridge AX는 흩어진 프로젝트 지식을 RAG 지식베이스로 동기화하고, 업무·일정·산출물을 한 곳에서 추적하는 기업용 협업 플랫폼입니다.</p>
      </div>

      <div class="brand-metrics">
        <div class="brand-metric"><span class="metric-num">48</span><span class="metric-lbl">완성 업무</span></div>
        <div class="metric-divider" />
        <div class="brand-metric"><span class="metric-num">6</span><span class="metric-lbl">지식 소스</span></div>
        <div class="metric-divider" />
        <div class="brand-metric"><span class="metric-num">8</span><span class="metric-lbl">팀 멤버</span></div>
      </div>

      <p class="brand-footer">&copy; 2026 DevBridge AX · 사내 인증 전용</p>
    </section>

    <!-- ══ RIGHT: Login Form ══ -->
    <main class="login-form-panel">
      <div class="form-block">
        <BrandLogo variant="light" size="lg" compact />
        <h1 class="form-title">다시 오신 것을 환영합니다</h1>
        <p class="form-subtitle">사번과 비밀번호로 로그인하세요.</p>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="field">
            <div class="field-label-row">
              <label class="field-label" for="employeeId">사번</label>
            </div>
            <div class="input-wrap">
              <span class="input-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              </span>
              <input id="employeeId" v-model="employeeId" type="text" class="form-input" placeholder="사번을 입력하세요" :disabled="isLoading" autocomplete="username" />
            </div>
          </div>

          <div class="field">
            <div class="field-label-row">
              <label class="field-label" for="password">비밀번호</label>
              <span class="forgot-link">비밀번호 찾기</span>
            </div>
            <div class="input-wrap">
              <span class="input-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input id="password" v-model="password" type="password" class="form-input" placeholder="비밀번호" :disabled="isLoading" autocomplete="current-password" />
            </div>
          </div>

          <div v-if="loginStatus === 'error'" class="form-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ errorMessage }}
          </div>

          <button id="login-submit-btn" type="submit" class="login-btn" :disabled="isLoading || !employeeId.trim() || !password">
            <span v-if="isLoading" class="spinner" />
            <span v-else>로그인</span>
          </button>

          <div class="divider"><span>또는</span></div>

          <button type="button" class="sso-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            SSO 사내 계정으로 계속하기
          </button>

          <div class="signup-row">
            <span class="signup-text">계정이 없으신가요?</span>
            <RouterLink id="signup-link" to="/signup" class="signup-link">회원가입</RouterLink>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ══ Login — Split Layout (Dashboard Unified) ══ */
.login-page {
  min-height: 100vh; display: grid;
  grid-template-columns: 45% 55%;
}

/* ══ LEFT: Branding Panel ══ */
.login-brand {
  display: flex; flex-direction: column; justify-content: center;
  padding: 56px 48px; gap: 32px;
  background: linear-gradient(145deg, #121831 0%, #1F2648 55%, #2A305C 100%);
  color: #fff;
}
.brand-top { display: flex; align-items: center; gap: 14px; }
.brand-logo {
  width: 42px; height: 42px; border-radius: 12px;
  background: var(--brand-gradient, linear-gradient(135deg,#6C63FF,#5B52E3));
  display: grid; place-items: center; flex-shrink: 0;
}
.brand-logo svg { width: 20px; height: 20px; }
.brand-top strong { font-size: 16px; font-weight: 700; display: block; }
.brand-top small { font-size: 11px; color: rgba(255,255,255,.5); }

.brand-body { display: flex; flex-direction: column; gap: 14px; }
.brand-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.brand-pill {
  display: inline-flex; padding: 3px 10px; border-radius: 999px;
  font-size: 10px; font-weight: 600;
  background: rgba(255,255,255,.08); color: rgba(255,255,255,.6);
}
.brand-pill--green { background: rgba(52,199,89,.15); color: #34C759; }

.brand-headline {
  font-size: 34px; font-weight: 800; line-height: 1.25;
  margin: 0; letter-spacing: -.03em;
}
.brand-desc {
  font-size: 14px; line-height: 1.7; color: rgba(255,255,255,.55);
  max-width: 520px; margin: 0;
}

.brand-metrics { display: flex; align-items: center; gap: 24px; }
.brand-metric { display: flex; flex-direction: column; gap: 2px; }
.metric-num { font-family: var(--font-mono); font-size: 26px; font-weight: 600; color: #fff; }
.metric-lbl { font-size: 11px; color: rgba(255,255,255,.4); }
.metric-divider { width: 1px; height: 32px; background: rgba(255,255,255,.1); }

.brand-footer { font-size: 11px; color: rgba(255,255,255,.25); margin: 0; }

/* ══ RIGHT: Login Form ══ */
.login-form-panel {
  display: flex; align-items: center; justify-content: center;
  padding: 40px; background: var(--page-bg, #F6F7FB);
}
.form-block { width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
.form-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: var(--brand-gradient, linear-gradient(135deg,#6C63FF,#5B52E3));
  color: #fff; display: grid; place-items: center;
  box-shadow: 0 6px 20px rgba(91,82,227,.25);
}
.form-icon svg { width: 26px; height: 26px; }
.form-title { font-size: 22px; font-weight: 800; color: var(--text-body, #1B2031); margin: 0; text-align: center; }
.form-subtitle { font-size: 14px; color: var(--text-secondary, #6B7191); margin: 0; text-align: center; }

.login-form { width: 100%; display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label-row { display: flex; justify-content: space-between; align-items: center; }
.field-label { font-size: 13px; font-weight: 600; color: var(--text-body, #1B2031); }
.forgot-link { font-size: 12px; color: var(--brand-indigo, #5B52E3); cursor: pointer; font-weight: 500; }
.forgot-link:hover { text-decoration: underline; }

.input-wrap { position: relative; display: flex; align-items: center; }
.input-ico {
  position: absolute; left: 14px; color: var(--text-light, #9AA0BD);
  display: flex; align-items: center; pointer-events: none;
}
.input-ico svg { width: 18px; height: 18px; }
.form-input {
  width: 100%; height: 50px; padding: 0 14px 0 44px;
  border-radius: 12px; border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff); color: var(--text-body, #1B2031);
  font-family: var(--font-ui); font-size: 14px; outline: none;
  transition: border-color .15s, box-shadow .15s; box-sizing: border-box;
}
.form-input::placeholder { color: var(--text-light, #9AA0BD); }
.form-input:focus { border-color: var(--brand-indigo, #5B52E3); box-shadow: 0 0 0 3px rgba(91,82,227,.1); }
.form-input:disabled { opacity: .5; cursor: not-allowed; }

.form-error {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 9px;
  background: var(--danger-bg, #FBF0F0); color: var(--danger-text, #D45D5D);
  font-size: 13px; font-weight: 500;
}

.login-btn {
  width: 100%; height: 50px; border-radius: 12px; border: 0;
  background: var(--brand-indigo, #5B52E3); color: #fff;
  font-family: var(--font-ui); font-size: 15px; font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  transition: all .15s; box-shadow: 0 4px 16px rgba(91,82,227,.25);
}
.login-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(91,82,227,.35); }
.login-btn:active:not(:disabled) { transform: translateY(0); }
.login-btn:disabled { opacity: .35; cursor: not-allowed; box-shadow: none; }

.divider { display: flex; align-items: center; gap: 12px; color: var(--text-light, #9AA0BD); font-size: 12px; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--card-border, #E8EAF2); }

.sso-btn {
  width: 100%; height: 48px; border-radius: 12px;
  border: 1px solid var(--card-border, #E8EAF2);
  background: var(--card-bg, #fff); color: var(--text-body, #1B2031);
  font-family: var(--font-ui); font-size: 14px; font-weight: 500; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  transition: all .12s;
}
.sso-btn:hover { border-color: var(--brand-indigo, #5B52E3); color: var(--brand-indigo, #5B52E3); }

.signup-row { display: flex; align-items: center; justify-content: center; gap: 6px; }
.signup-text { font-size: 13px; color: var(--text-secondary, #6B7191); }
.signup-link { font-size: 13px; font-weight: 600; color: var(--brand-indigo, #5B52E3); text-decoration: none; }
.signup-link:hover { text-decoration: underline; }

.spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .65s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width:900px) { .login-page { grid-template-columns: 1fr; } .login-brand { min-height: 300px; padding: 32px 28px; gap: 20px; } .brand-headline { font-size: 28px; } }
@media (max-width:500px) { .form-block { gap: 16px; } .login-form-panel { padding: 24px 16px; } .form-title { font-size: 18px; } }
</style>
