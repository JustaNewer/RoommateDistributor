import { createI18n } from 'vue-i18n'
import zh from './locales/zh'
import en from './locales/en'

// 从 localStorage 或路径读取语言设置，默认中文
const savedLocale = localStorage.getItem('locale') || 'zh'

const i18n = createI18n({
  legacy: true,
  locale: savedLocale,
  fallbackLocale: 'zh',
  messages: { zh, en }
})

export default i18n
