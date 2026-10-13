<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome(): void {
  // '/' 라우트가 인증 상태에 따라 리다이렉트한다
  router.push('/')
}
</script>

<template>
  <main class="not-found-page">
    <p class="not-found-code">404</p>
    <h1 class="not-found-title">페이지를 찾을 수 없습니다</h1>
    <p class="not-found-desc">주소가 잘못되었거나 삭제된 페이지입니다.</p>
    <button type="button" class="not-found-btn" @click="goHome">홈으로</button>
  </main>
</template>

<style scoped>
.not-found-page {
  min-height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px;
  padding: 24px; text-align: center;
  background: var(--page-bg, #f6f7fb); font-family: var(--font-ui, sans-serif);
}
.not-found-code { margin: 0; font-size: 96px; font-weight: 800; line-height: 1; color: var(--brand-indigo, #5b52e3); }
.not-found-title { margin: 0; font-size: 22px; font-weight: 800; color: var(--text-body, #1b2031); }
.not-found-desc { margin: 0; font-size: 14px; color: var(--text-secondary, #6b7191); }
.not-found-btn {
  margin-top: 12px; height: 44px; padding: 0 24px; border: 0;
  border-radius: var(--card-radius, 14px);
  background: var(--brand-indigo, #5b52e3); color: #fff;
  font-family: var(--font-ui, sans-serif); font-size: 14px; font-weight: 700; cursor: pointer;
}
.not-found-btn:hover { opacity: .9; }
</style>
