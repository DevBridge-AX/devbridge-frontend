<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  showSubtitle?: boolean
  compact?: boolean
}>(), {
  variant: 'dark',
  size: 'md',
  showSubtitle: false,
  compact: false,
})

import logoSrc from '@/assets/logo.png'
</script>

<template>
  <div class="bl" :class="[`bl-${variant}`, `bl-${size}`, { compact }]">
    <img :src="logoSrc" class="bl-img" :class="`bl-img-${size}`" alt="DevBridge AX" />
    <div v-if="!compact" class="bl-txt">
      <div class="bl-row">
        <span class="bl-main">DevBridge</span>
        <span class="bl-acc">AX</span>
      </div>
      <span v-if="showSubtitle" class="bl-sub">Project Platform</span>
    </div>
  </div>
</template>

<style scoped>
.bl { display: flex; align-items: center; gap: 10px; }
.bl.compact { gap: 8px; }
.bl-img {
  flex-shrink: 0; object-fit: contain;
}
.bl-img-sm { width: 32px; height: 32px; }
.bl-img-md { width: 40px; height: 40px; }
.bl-img-lg { width: 52px; height: 52px; }

.bl-txt { display: flex; flex-direction: column; gap: 1px; }
.bl-row { display: flex; align-items: baseline; gap: 2px; }
.bl-main { font-weight: 800; letter-spacing: -.02em; line-height: 1.2; }
.bl-acc { font-weight: 800; letter-spacing: -.02em; line-height: 1.2; }

.bl-dark .bl-main { color: #fff; }
.bl-dark .bl-acc { color: #8B7CFF; }
.bl-dark .bl-sub { color: rgba(255,255,255,.5); }
.bl-light .bl-main { color: var(--text-body, #1B2031); }
.bl-light .bl-acc { color: #6D5DFC; }
.bl-light .bl-sub { color: var(--text-light, #9AA0BD); }

.bl-sub { font-size: 10px; font-weight: 500; }
.bl-sm .bl-main, .bl-sm .bl-acc { font-size: 13px; }
.bl-sm .bl-sub { font-size: 9px; }
.bl-md .bl-main, .bl-md .bl-acc { font-size: 15px; }
.bl-md .bl-sub { font-size: 10px; }
.bl-lg .bl-main, .bl-lg .bl-acc { font-size: 18px; }
.bl-lg .bl-sub { font-size: 11px; }
</style>
