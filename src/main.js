import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

// 在挂载前初始化主题，避免闪烁
const savedTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)

const app = createApp(App)
app.use(router)
app.use(i18n)
app.mount('#app')
