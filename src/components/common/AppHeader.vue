<template>
  <header class="app-header">
    <div class="header-inner">
      <RouterLink class="brand" to="/workspace">
        <strong>DevBridge AX</strong>
        <span>Project Intelligence Platform</span>
      </RouterLink>

      <nav class="nav-menu" aria-label="main navigation">
        <RouterLink to="/workspace">Dashboard</RouterLink>
        <RouterLink to="/workspace">Workspace</RouterLink>
        <RouterLink to="/settings/profile">Profile</RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 40px;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-decoration: none;
}

.brand strong {
  color: #172033;
  font-size: 18px;
}

.brand span {
  color: #667085;
  font-size: 12px;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-menu a {
  color: #475467;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.nav-menu a:hover,
.nav-menu a.router-link-active {
  color: #263b70;
}

@media (max-width: 800px) {
  .header-inner {
    align-items: flex-start;
    flex-direction: column;
    height: auto;
    gap: 12px;
    padding: 16px 24px;
  }

  .nav-menu {
    flex-wrap: wrap;
    gap: 12px;
  }
}
</style>
