<script setup lang="ts">
import AppToast from '@/components/common/AppToast.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
</script>

<template>
  <RouterView />
  <AppToast />
  <AppConfirmDialog />
</template>
