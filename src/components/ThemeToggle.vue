<template>
  <button
    class="theme-btn"
    @click="toggle"
    :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
    :class="{ 'is-light': !isDark }"
  >
    <span class="icon-wrap">
      <!-- Moon (shown in dark mode) -->
      <svg
        v-if="isDark"
        class="t-icon moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <!-- Sun (shown in light mode) -->
      <svg
        v-else
        class="t-icon sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1"  x2="12" y2="3"  />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"  />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1"  y1="12" x2="3"  y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
        <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
      </svg>
    </span>
  </button>
</template>

<script>
export default {
  name: 'ThemeToggle',
  data() {
    return {
      isDark: true
    }
  },
  created() {
    const saved = localStorage.getItem('theme') || 'dark'
    this.isDark = saved === 'dark'
  },
  methods: {
    toggle() {
      this.isDark = !this.isDark
      const theme = this.isDark ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('theme', theme)
    }
  }
}
</script>

<style scoped>
.theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-1);
  transition: background 0.25s, border-color 0.25s, box-shadow 0.25s, transform 0.2s;
  flex-shrink: 0;
}

.theme-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(76, 175, 80, 0.5);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.25);
  transform: rotate(15deg);
}

/* Light mode button appearance */
.theme-btn.is-light {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.15);
  color: #f59e0b;
}

.theme-btn.is-light:hover {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.5);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.t-icon {
  width: 16px;
  height: 16px;
  animation: icon-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes icon-pop {
  0%   { transform: scale(0.5) rotate(-30deg); opacity: 0; }
  100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
}
</style>
