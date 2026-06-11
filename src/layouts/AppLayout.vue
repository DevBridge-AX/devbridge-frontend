<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import AppFooter from '@/components/common/AppFooter.vue'
</script>

<template>
  <div class="app-layout">
    <AppHeader />

    <main class="app-body">
      <slot />
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fb;
}

.app-body {
  flex: 1;
}
</style>
