<template>
  <!-- 保持原有模板不变 -->
  <div class="app-container">
    <!-- Left side - Application Description -->
    <div class="description-section">
      <div class="description-content">
        <h1 class="title">智能舍友分配系统</h1>
        <p class="description">
          欢迎使用我们的智能舍友分配系统
          <span class="highlight">为您匹配最合适的室友</span>
        </p>
        <div class="animated-circles">
          <div class="circle"></div>
          <div class="circle"></div>
          <div class="circle"></div>
        </div>
      </div>
    </div>

    <!-- Right side - Auth Card -->
    <div class="login-section">
      <div class="login-card">
        <transition name="fade" mode="out-in">
          <!-- Login Form -->
          <div v-if="!isRegistering" key="login" class="form-container">
            <h2>用户登录</h2>
            <div class="input-group">
              <input type="text" v-model="loginForm.username" placeholder="用户名" />
            </div>
            <div class="input-group">
              <input type="password" v-model="loginForm.password" placeholder="密码" />
            </div>
            <div class="message" :class="{ error: loginMessage.type === 'error' }" v-if="loginMessage.content">
              {{ loginMessage.content }}
            </div>
            <div class="button-group">
              <button class="login-btn" @click="handleLogin" :disabled="isLoading">
                {{ isLoading ? '登录中...' : '登录' }}
              </button>
              <button class="register-btn" @click="toggleForm" :disabled="isLoading">注册</button>
            </div>
          </div>

          <!-- Register Form -->
          <div v-else key="register" class="form-container">
            <h2>用户注册</h2>
            <div class="input-group">
              <input type="text" v-model="registerForm.username" placeholder="设置用户名" />
            </div>
            <div class="input-group">
              <input type="password" v-model="registerForm.password" placeholder="设置密码" />
            </div>
            <div class="input-group">
              <input type="password" v-model="registerForm.confirmPassword" placeholder="确认密码" />
            </div>
            <div class="message" :class="{ error: registerMessage.type === 'error' }" v-if="registerMessage.content">
              {{ registerMessage.content }}
            </div>
            <div class="button-group">
              <button class="confirm-btn" @click="handleRegister" :disabled="isLoading">
                {{ isLoading ? '注册中...' : '确认注册' }}
              </button>
              <button class="back-btn" @click="toggleForm" :disabled="isLoading">返回登录</button>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginPage',
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
        confirmPassword: ''
      },
      loginMessage: {
        content: '',
        type: ''
      },
      registerMessage: {
        content: '',
        type: ''
      }
    }
  },
  methods: {
    toggleForm() {
      this.isRegistering = !this.isRegistering;
      this.loginMessage.content = '';
      this.registerMessage.content = '';
      this.loginForm = { username: '', password: '' };
      this.registerForm = { username: '', password: '', confirmPassword: '' };
    },
    async handleLogin() {
      if (!this.loginForm.username || !this.loginForm.password) {
        this.loginMessage = {
          content: '请填写用户名和密码',
          type: 'error'
        };
        return;
      }

      try {
        this.isLoading = true;
        const response = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.loginForm)
        });

        const data = await response.json();

        if (response.ok) {
          this.loginMessage = {
            content: '登录成功',
            type: 'success'
          };
          // 保存用户信息
          localStorage.setItem('userId', data.user.id);
          localStorage.setItem('username', data.user.username);
          // 跳转到主页
          this.$router.push('/home');
        } else {
          this.loginMessage = {
            content: data.message || '登录失败',
            type: 'error'
          };
        }
      } catch (error) {
        this.loginMessage = {
          content: '网络错误，请稍后重试',
          type: 'error'
        };
        console.error('登录错误:', error);
      } finally {
        this.isLoading = false;
      }
    },
    async handleRegister() {
      if (!this.registerForm.username || !this.registerForm.password || !this.registerForm.confirmPassword) {
        this.registerMessage = {
          content: '请填写所有字段',
          type: 'error'
        };
        return;
      }

      if (this.registerForm.password !== this.registerForm.confirmPassword) {
        this.registerMessage = {
          content: '两次输入的密码不一致',
          type: 'error'
        };
        return;
      }

      try {
        this.isLoading = true;
        const response = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: this.registerForm.username,
            password: this.registerForm.password
          })
        });

        const data = await response.json();

        if (response.ok) {
          this.registerMessage = {
            content: '注册成功',
            type: 'success'
          };
          setTimeout(() => {
            this.toggleForm();
          }, 3000);
        } else {
          this.registerMessage = {
            content: data.message || '注册失败',
            type: 'error'
          };
        }
      } catch (error) {
        this.registerMessage = {
          content: '网络错误，请稍后重试',
          type: 'error'
        };
        console.error('注册错误:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #1a1a1a;
}

.app-container {
  display: flex;
  min-height: 100vh;
  background-color: #1a1a1a;
  color: #ffffff;
}

.description-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.description-content {
  text-align: center;
  z-index: 1;
}

.title {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  color: #ffffff;
}

.description {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.highlight {
  color: #4CAF50;
  font-weight: bold;
  display: block;
  margin-top: 0.5rem;
}

.animated-circles {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(76, 175, 80, 0.1);
  animation: float 8s infinite;
}

.circle:nth-child(1) {
  width: 150px;
  height: 150px;
  left: 10%;
  top: 20%;
  animation-delay: 0s;
}

.circle:nth-child(2) {
  width: 100px;
  height: 100px;
  left: 60%;
  top: 40%;
  animation-delay: 2s;
}

.circle:nth-child(3) {
  width: 80px;
  height: 80px;
  left: 30%;
  top: 60%;
  animation-delay: 4s;
}

@keyframes float {
  0% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
  100% { transform: translateY(0) rotate(360deg); }
}

.login-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-card {
  background-color: #2a2a2a;
  padding: 2.5rem;
  border-radius: 15px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.login-card h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #ffffff;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-group input {
  width: 100%;
  padding: 12px;
  border: none;
  background-color: #3a3a3a;
  border-radius: 8px;
  color: #ffffff;
  font-size: 1rem;
}

.input-group input::placeholder {
  color: #888;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.button-group button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
}

.button-group button:hover {
  transform: translateY(-2px);
  opacity: 0.9;
}

.login-btn {
  background-color: #4CAF50;
  color: white;
}

.register-btn {
  background-color: #2196F3;
  color: white;
}

.form-container {
  width: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.confirm-btn {
  background-color: #4CAF50;
  color: white;
}

.back-btn {
  background-color: #f44336;
  color: white;
}

.message {
  margin: 10px 0;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
}

.message.error {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.message.success {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style> 