<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <span>© 2026 DevBridge AX</span>
      <span>Workspace Dashboard MVP</span>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  border-top: 1px solid #e5e7eb;
  background: white;
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 40px;
  color: #667085;
  font-size: 13px;
}

@media (max-width: 800px) {
  .footer-inner {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
    padding: 16px 24px;
  }
}
</style>
