<template>
  <button
    class="lang-toggle"
    @click="toggle"
    :title="$i18n.locale === 'en' ? '切换到中文' : 'Switch to English'"
    :class="{ 'is-en': $i18n.locale === 'en' }"
  >
    <span class="lang-track">
      <span class="lang-knob"></span>
    </span>
    <span class="lang-label lang-zh" :class="{ dim: $i18n.locale === 'en' }">中</span>
    <span class="lang-label lang-en" :class="{ dim: $i18n.locale === 'zh' }">EN</span>
  </button>
</template>

<script>
export default {
  name: 'LangToggle',
  methods: {
    toggle() {
      const currentPath = this.$route.fullPath
      if (this.$i18n.locale === 'zh') {
        // → English: add /en prefix
        const newPath = '/en' + (currentPath === '/' ? '/' : currentPath)
        this.$router.push(newPath)
      } else {
        // → Chinese: remove /en prefix
        const newPath = currentPath.replace(/^\/en/, '') || '/'
        this.$router.push(newPath)
      }
    }
  }
}
</script>

<style scoped>
.lang-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 5px 10px 5px 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  user-select: none;
  color: var(--text-1);
}

.lang-toggle:hover {
  background: var(--accent-light);
  border-color: rgba(76, 175, 80, 0.5);
  box-shadow: 0 0 8px var(--accent-glow);
}

/* 轨道 */
.lang-track {
  position: relative;
  width: 28px;
  height: 16px;
  background: var(--bg-3);
  border-radius: 8px;
  transition: background 0.3s ease;
  flex-shrink: 0;
}

.lang-toggle.is-en .lang-track {
  background: #4CAF50;
}

/* 滑块 */
.lang-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.lang-toggle.is-en .lang-knob {
  transform: translateX(12px);
}

/* 文字标签 */
.lang-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--text-1);
  transition: opacity 0.25s ease, color 0.25s ease;
  line-height: 1;
}

.lang-label.dim {
  opacity: 0.4;
}

.lang-zh {
  order: -1;
}
</style>
