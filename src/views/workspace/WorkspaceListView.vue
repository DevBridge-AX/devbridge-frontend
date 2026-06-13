<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { workspaceService } from '@/services/workspaceService'
import type { Workspace } from '@/api/workspaceApi'

const router = useRouter()

const isLoading = ref(false)
const errorMessage = ref('')
const workspaces = ref<Workspace[]>([])

const fetchWorkspaces = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    workspaces.value = await workspaceService.getMyWorkspaces()
  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMessage.value = error.message
      return
    }

    errorMessage.value = '워크스페이스 목록을 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

const enterWorkspace = async (workspaceId: string) => {
  errorMessage.value = ''

  try {
    await workspaceService.updateWorkspaceAccess(workspaceId)
  } catch (error: unknown) {
    if (error instanceof Error) {
      errorMessage.value = error.message
      return
    }

    errorMessage.value = '워크스페이스 접속 정보를 갱신하지 못했습니다.'
    return
  }

  await router.push(`/workspaces/${workspaceId}/dashboard`)
}

onMounted(() => {
  void fetchWorkspaces()
})
</script>

<template>
  <AppLayout>
    <section class="workspace-page">
      <div class="page-header">
        <div>
          <p class="eyebrow">Workspace</p>
          <h1>내 워크스페이스</h1>
          <p class="description">
            참여 중인 워크스페이스를 선택하면 해당 대시보드로 이동합니다.
          </p>
        </div>

        <button class="refresh-button" type="button" @click="fetchWorkspaces">
          새로고침
        </button>
      </div>

      <section v-if="isLoading" class="state-box">
        워크스페이스 목록을 불러오는 중입니다.
      </section>

      <section v-else-if="errorMessage" class="state-box error">
        <strong>조회 실패</strong>
        <p>{{ errorMessage }}</p>
        <button class="retry-button" type="button" @click="fetchWorkspaces">
          다시 시도
        </button>
      </section>

      <section v-else-if="workspaces.length === 0" class="state-box">
        참여 중인 워크스페이스가 없습니다.
      </section>

      <section v-else class="workspace-grid">
        <article
          v-for="workspace in workspaces"
          :key="workspace.id"
          class="workspace-card"
        >
          <div>
            <h2>{{ workspace.name }}</h2>
            <p>
              {{
                workspace.description ||
                '설명이 등록되지 않은 워크스페이스입니다.'
              }}
            </p>
          </div>

          <button
            class="enter-button"
            type="button"
            @click="enterWorkspace(workspace.id)"
          >
            대시보드로 이동
          </button>
        </article>
      </section>
    </section>
  </AppLayout>
</template>

<style scoped>
.workspace-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, #172033, #263b70);
  color: white;
  padding: 32px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #b7c4ff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  font-size: 32px;
}

.description {
  max-width: 560px;
  margin: 12px 0 0;
  color: #d8def8;
  line-height: 1.6;
}

.refresh-button,
.retry-button,
.enter-button {
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
}

.refresh-button {
  background: white;
  color: #263b70;
  padding: 12px 18px;
}

.state-box {
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: white;
  color: #475467;
  padding: 28px;
}

.state-box.error {
  border-color: #fecaca;
  background: #fff7f7;
  color: #b42318;
}

.state-box p {
  margin: 8px 0 16px;
}

.retry-button {
  background: #b42318;
  color: white;
  padding: 10px 14px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.workspace-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 200px;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  background: white;
  box-shadow: 0 18px 40px rgba(16, 24, 40, 0.08);
  padding: 24px;
}

.workspace-card h2 {
  margin: 0;
  color: #172033;
  font-size: 22px;
}

.workspace-card p {
  margin: 12px 0 0;
  color: #667085;
  line-height: 1.6;
}

.enter-button {
  align-self: flex-start;
  margin-top: 24px;
  background: #263b70;
  color: white;
  padding: 12px 16px;
}

.enter-button:hover,
.refresh-button:hover,
.retry-button:hover {
  opacity: 0.9;
}

@media (max-width: 800px) {
  .page-header {
    flex-direction: column;
  }

  .refresh-button {
    width: 100%;
  }
}
</style>
