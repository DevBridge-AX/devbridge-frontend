import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { SESSION_EXPIRED_EVENT } from '@/api/apiError'
import { authService } from '@/services/authService'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 세션 만료(401) 이벤트 수신 시 로그아웃 및 로그인 화면 이동을 처리합니다.
window.addEventListener(SESSION_EXPIRED_EVENT, () => {
  void authService.handleSessionExpired(router)
})

app.mount('#app')
