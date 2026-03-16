<template>
  <div class="auth-root">
    <!-- Theme + Language Toggles -->
    <div class="toggles-fixed">
      <ThemeToggle />
      <LangToggle />
    </div>

    <!-- ===== LEFT PANEL ===== -->
    <div class="left-panel">
      <!-- Decorative orbs -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      <!-- Grid overlay -->
      <div class="grid-overlay"></div>

      <div class="brand-content">
        <!-- Logo mark -->
        <div class="logo-mark">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="19" stroke="url(#lg)" stroke-width="2"/>
            <path d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke="url(#lg)" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="20" cy="20" r="3" fill="url(#lg)"/>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stop-color="#4ade80"/>
                <stop offset="1" stop-color="#22d3ee"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 class="brand-title">{{ $t('login.systemTitle') }}</h1>
        <p class="brand-subtitle">{{ $t('login.systemDesc') }}</p>
        <p class="brand-highlight">{{ $t('login.systemHighlight') }}</p>

        <!-- Feature chips -->
        <div class="feature-list">
          <div class="feature-chip">
            <span class="chip-icon">🧠</span>
            <span>AI 性格匹配</span>
          </div>
          <div class="feature-chip">
            <span class="chip-icon">🏠</span>
            <span>智能宿舍管理</span>
          </div>
          <div class="feature-chip">
            <span class="chip-icon">⚡</span>
            <span>一键分配舍友</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== RIGHT PANEL ===== -->
    <div class="right-panel">
      <div class="form-card">
        <!-- Card header -->
        <div class="card-header">
          <div class="card-logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="19" stroke="url(#lg2)" stroke-width="2"/>
              <path d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke="url(#lg2)" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="20" cy="20" r="3" fill="url(#lg2)"/>
              <defs>
                <linearGradient id="lg2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#4ade80"/>
                  <stop offset="1" stop-color="#22d3ee"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <transition name="slide-title" mode="out-in">
            <div :key="isRegistering ? 'reg' : 'log'" class="card-title-block">
              <h2 class="card-title">
                {{ isRegistering ? $t('login.registerTitle') : $t('login.loginTitle') }}
              </h2>
              <p class="card-desc">
                {{ isRegistering ? $t('login.fillAllFields') : $t('login.fillAll') }}
              </p>
            </div>
          </transition>
        </div>

        <!-- Form area with transition -->
        <transition name="fade-slide" mode="out-in">

          <!-- ── LOGIN FORM ── -->
          <div v-if="!isRegistering" key="login" class="form-body">
            <div class="field">
              <label class="field-label">{{ $t('login.username') }}</label>
              <div class="field-input-wrap">
                <span class="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  type="text"
                  v-model="loginForm.username"
                  :placeholder="$t('login.username')"
                  class="field-input"
                  @keyup.enter="handleLogin"
                />
              </div>
            </div>

            <div class="field">
              <label class="field-label">{{ $t('login.password') }}</label>
              <div class="field-input-wrap">
                <span class="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  :type="passwordVisibility.login ? 'text' : 'password'"
                  v-model="loginForm.password"
                  :placeholder="$t('login.password')"
                  class="field-input"
                  @keyup.enter="handleLogin"
                />
                <button class="eye-btn" type="button" @click="togglePasswordVisibility('login')">
                  <svg v-if="passwordVisibility.login" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Message -->
            <transition name="msg-fade">
              <div v-if="loginMessage.content" class="msg" :class="loginMessage.type">
                <svg v-if="loginMessage.type === 'error'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {{ loginMessage.content }}
              </div>
            </transition>

            <button class="submit-btn" @click="handleLogin" :disabled="isLoading">
              <span v-if="isLoading" class="loading-dots">
                <span></span><span></span><span></span>
              </span>
              <span v-else>{{ $t('login.loginBtn') }}</span>
            </button>

            <div class="divider"><span>{{ $i18n.locale === 'en' ? 'or' : '或者' }}</span></div>

            <button class="switch-btn" @click="toggleForm" :disabled="isLoading">
              {{ $t('login.registerBtn') }} →
            </button>
          </div>

          <!-- ── REGISTER FORM ── -->
          <div v-else key="register" class="form-body">
            <div class="field">
              <label class="field-label">{{ $t('login.setUsername') }}</label>
              <div class="field-input-wrap">
                <span class="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  type="text"
                  v-model="registerForm.username"
                  :placeholder="$t('login.setUsername')"
                  class="field-input"
                />
              </div>
            </div>

            <div class="field">
              <label class="field-label">{{ $t('login.setPassword') }}</label>
              <div class="field-input-wrap">
                <span class="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  :type="passwordVisibility.register ? 'text' : 'password'"
                  v-model="registerForm.password"
                  :placeholder="$t('login.setPassword')"
                  class="field-input"
                />
                <button class="eye-btn" type="button" @click="togglePasswordVisibility('register')">
                  <svg v-if="passwordVisibility.register" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="field">
              <label class="field-label">{{ $t('login.confirmPassword') }}</label>
              <div class="field-input-wrap">
                <span class="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  :type="passwordVisibility.confirm ? 'text' : 'password'"
                  v-model="registerForm.confirmPassword"
                  :placeholder="$t('login.confirmPassword')"
                  class="field-input"
                />
                <button class="eye-btn" type="button" @click="togglePasswordVisibility('confirm')">
                  <svg v-if="passwordVisibility.confirm" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="field">
              <label class="field-label">{{ $t('login.roleLabel') }}</label>
              <div class="role-selector">
                <label class="role-option" :class="{ active: registerForm.role === 'resident' }">
                  <input type="radio" v-model="registerForm.role" value="resident" class="role-radio" />
                  <span class="role-icon">🏠</span>
                  <span class="role-text">{{ $t('login.roleResident') }}</span>
                </label>
                <label class="role-option" :class="{ active: registerForm.role === 'admin' }">
                  <input type="radio" v-model="registerForm.role" value="admin" class="role-radio" />
                  <span class="role-icon">🔧</span>
                  <span class="role-text">{{ $t('login.roleAdmin') }}</span>
                </label>
              </div>
            </div>

            <!-- Message -->
            <transition name="msg-fade">
              <div v-if="registerMessage.content" class="msg" :class="registerMessage.type">
                <svg v-if="registerMessage.type === 'error'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {{ registerMessage.content }}
              </div>
            </transition>

            <button class="submit-btn" @click="handleRegister" :disabled="isLoading">
              <span v-if="isLoading" class="loading-dots">
                <span></span><span></span><span></span>
              </span>
              <span v-else>{{ $t('login.confirmRegister') }}</span>
            </button>

            <div class="divider"><span>{{ $i18n.locale === 'en' ? 'or' : '或者' }}</span></div>

            <button class="switch-btn" @click="toggleForm" :disabled="isLoading">
              ← {{ $t('login.backToLogin') }}
            </button>
          </div>

        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import LangToggle from '../components/LangToggle.vue'
import ThemeToggle from '../components/ThemeToggle.vue'

export default {
  name: 'LoginPage',
  components: { LangToggle, ThemeToggle },
  data() {
    return {
      isRegistering: false,
      isLoading: false,
      loginForm: {
        username: '',
        password: ''
      },
      registerForm: {
        username: '',
        password: '',
        confirmPassword: '',
        role: ''
      },
      loginMessage: {
        content: '',
        type: ''
      },
      registerMessage: {
        content: '',
        type: ''
      },
      passwordVisibility: {
        login: false,
        register: false,
        confirm: false
      }
    }
  },
  methods: {
    togglePasswordVisibility(field) {
      this.passwordVisibility[field] = !this.passwordVisibility[field];
    },
    toggleForm() {
      this.isRegistering = !this.isRegistering;
      this.loginMessage.content = '';
      this.registerMessage.content = '';
      this.loginForm = { username: '', password: '' };
      this.registerForm = { username: '', password: '', confirmPassword: '', role: '' };
      this.passwordVisibility = { login: false, register: false, confirm: false };
    },
    async handleLogin() {
      if (!this.loginForm.username || !this.loginForm.password) {
        this.loginMessage = { content: this.$t('login.fillAll'), type: 'error' };
        return;
      }
      try {
        this.isLoading = true;
        const response = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.loginForm)
        });
        const data = await response.json();
        if (response.ok) {
          this.loginMessage = { content: this.$t('login.loginSuccess'), type: 'success' };
          localStorage.setItem('userToken', data.token);
          localStorage.setItem('userId', String(data.user.id));
          localStorage.setItem('username', data.user.username);
          localStorage.setItem('userRole', data.user.role);
          const redirectPath = this.$route.query.redirect || '/';
          this.$router.push(redirectPath);
        } else {
          this.loginMessage = { content: data.message || this.$t('login.loginFailed'), type: 'error' };
        }
      } catch (error) {
        this.loginMessage = { content: this.$t('login.networkError'), type: 'error' };
        console.error('登录错误:', error);
      } finally {
        this.isLoading = false;
      }
    },
    async handleRegister() {
      if (!this.registerForm.username || !this.registerForm.password || !this.registerForm.confirmPassword) {
        this.registerMessage = { content: this.$t('login.fillAllFields'), type: 'error' };
        return;
      }
      if (this.registerForm.password !== this.registerForm.confirmPassword) {
        this.registerMessage = { content: this.$t('login.passwordMismatch'), type: 'error' };
        return;
      }
      if (!this.registerForm.role) {
        this.registerMessage = { content: this.$t('login.selectRole'), type: 'error' };
        return;
      }
      try {
        this.isLoading = true;
        const response = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.registerForm.username,
            password: this.registerForm.password,
            role: this.registerForm.role
          })
        });
        const data = await response.json();
        if (response.ok) {
          this.registerMessage = { content: this.$t('login.registerSuccess'), type: 'success' };
          setTimeout(() => { this.toggleForm(); }, 1500);
        } else {
          this.registerMessage = { content: data.message || this.$t('login.registerFailed'), type: 'error' };
        }
      } catch (error) {
        this.registerMessage = { content: this.$t('login.networkError'), type: 'error' };
        console.error('注册错误:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }
}
</script>

<style scoped>
/* ─────────── Reset / Root ─────────── */
.auth-root {
  display: flex;
  min-height: 100vh;
  background: var(--login-bg);
  color: var(--text-1);
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  position: relative;
}

.toggles-fixed {
  position: fixed;
  top: 20px;
  right: 24px;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 50px;
}

/* ─────────── LEFT PANEL ─────────── */
.left-panel {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, var(--login-panel-from) 0%, var(--login-panel-to) 50%, var(--login-panel-from) 100%);
  padding: 3rem;
}

/* Grid overlay */
.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(74, 222, 128, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 222, 128, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
}

/* Decorative orbs */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.orb-1 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.18), transparent 70%);
  top: -100px; left: -100px;
  animation: orbFloat 10s ease-in-out infinite;
}
.orb-2 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.14), transparent 70%);
  bottom: -80px; right: -60px;
  animation: orbFloat 13s ease-in-out infinite reverse;
}
.orb-3 {
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.12), transparent 70%);
  top: 50%; left: 60%;
  animation: orbFloat 8s ease-in-out infinite 2s;
}
@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%       { transform: translate(20px, -30px) scale(1.05); }
}

/* Brand content */
.brand-content {
  position: relative;
  z-index: 1;
  max-width: 420px;
}

.logo-mark {
  width: 52px;
  height: 52px;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 0 16px rgba(74, 222, 128, 0.5));
}

.brand-title {
  font-size: clamp(1.8rem, 3vw, 2.8rem);
  font-weight: 800;
  line-height: 1.15;
  margin: 0 0 1rem;
  background: linear-gradient(135deg, #4ade80 0%, #22d3ee 50%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-subtitle {
  font-size: 1rem;
  color: var(--login-text-sub);
  line-height: 1.6;
  margin-bottom: 0.4rem;
}

.brand-highlight {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4ade80;
  margin-bottom: 2.5rem;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.feature-chip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--login-card-border);
  border-radius: 10px;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  color: #cbd5e1;
  transition: border-color 0.2s, background 0.2s;
}
.feature-chip:hover {
  border-color: rgba(74, 222, 128, 0.3);
  background: rgba(74, 222, 128, 0.05);
}
.chip-icon { font-size: 1.1rem; }

/* ─────────── RIGHT PANEL ─────────── */
.right-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem;
  background: var(--login-bg);
}

.form-card {
  width: 100%;
  max-width: 420px;
  background: var(--login-card-bg);
  border: 1px solid var(--login-card-border);
  border-radius: 20px;
  padding: 2.5rem 2.5rem 2rem;
  box-shadow:
    0 0 0 1px rgba(74, 222, 128, 0.05),
    0 24px 48px rgba(0, 0, 0, 0.5);
}

/* Card header */
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}
.card-logo {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  margin-top: 3px;
}
.card-title-block { flex: 1; }
.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-1);
  margin: 0 0 0.25rem;
}
.card-desc {
  font-size: 0.82rem;
  color: var(--login-text-muted);
  margin: 0;
}

/* Form body */
.form-body {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Fields */
.field {
  margin-bottom: 1.1rem;
}
.field-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--login-text-sub);
  margin-bottom: 0.45rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.field-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.field-icon {
  position: absolute;
  left: 13px;
  color: var(--login-icon);
  display: flex;
  align-items: center;
  pointer-events: none;
  transition: color 0.2s;
}
.field-input {
  width: 100%;
  height: 44px;
  padding: 0 42px;
  background: var(--login-input-bg);
  border: 1px solid var(--login-card-border);
  border-radius: 10px;
  color: var(--text-1);
  font-size: 0.92rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}
.field-input::placeholder { color: var(--login-icon); }
.field-input:focus {
  border-color: rgba(74, 222, 128, 0.5);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.08);
}
.field-input:focus + .field-icon,
.field-input-wrap:focus-within .field-icon {
  color: #4ade80;
}
.eye-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--login-icon);
  display: flex;
  align-items: center;
  padding: 2px;
  transition: color 0.2s;
}
.eye-btn:hover { color: #4ade80; }

/* Message */
.msg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  padding: 9px 12px;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.msg.error {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.msg.success {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.2);
}

/* Submit button */
.submit-btn {
  width: 100%;
  height: 46px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: var(--text-1);
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.25);
}
.submit-btn:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35);
}
.submit-btn:active:not(:disabled) { transform: translateY(0); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Loading dots */
.loading-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}
.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: dot-bounce 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40%            { transform: scale(1);   opacity: 1; }
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: var(--border-solid);
  font-size: 0.78rem;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}

/* Switch button */
.switch-btn {
  width: 100%;
  height: 44px;
  background: transparent;
  color: var(--login-text-sub);
  border: 1px solid var(--login-card-border);
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.switch-btn:hover:not(:disabled) {
  border-color: rgba(74, 222, 128, 0.4);
  color: #4ade80;
  background: rgba(74, 222, 128, 0.04);
}
.switch-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ─────────── Transitions ─────────── */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-slide-enter-from { opacity: 0; transform: translateY(10px); }
.fade-slide-leave-to   { opacity: 0; transform: translateY(-10px); }

.slide-title-enter-active,
.slide-title-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.slide-title-enter-from { opacity: 0; transform: translateX(8px); }
.slide-title-leave-to   { opacity: 0; transform: translateX(-8px); }

.msg-fade-enter-active,
.msg-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.msg-fade-enter-from   { opacity: 0; transform: translateY(-4px); }
.msg-fade-leave-to     { opacity: 0; }

/* ─────────── Responsive ─────────── */
.role-selector {
  display: flex;
  gap: 12px;
}

.role-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1.5px solid var(--login-input-border);
  border-radius: 10px;
  background: var(--login-input-bg);
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-option:hover {
  border-color: rgba(74, 222, 128, 0.4);
}

.role-option.active {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.08);
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.15);
}

.role-radio {
  display: none;
}

.role-icon {
  font-size: 1.2rem;
}

.role-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--login-text);
}

@media (max-width: 768px) {
  .left-panel { display: none; }
  .right-panel { padding: 1.5rem; }
  .form-card   { padding: 2rem 1.5rem; }
}
</style>
