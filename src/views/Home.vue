<template>
  <div class="home-container">
    <header class="header">
      <div class="header-content">
        <h1>智能舍友分配系统</h1>
        <div class="user-info">
          <span>欢迎, {{ username }}</span>
          <button class="logout-btn" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </header>
    
    <main class="main-content">
      <div class="welcome-message">
        <h2>欢迎使用智能舍友分配系统</h2>
        <p>这里是系统主页，更多功能开发中...</p>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  data() {
    return {
      username: localStorage.getItem('username') || '用户'
    }
  },
  methods: {
    handleLogout() {
      // 清除用户信息
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      // 跳转到登录页
      this.$router.push('/login');
    }
  }
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background-color: #1a1a1a;
  color: #ffffff;
}

.header {
  background-color: #2a2a2a;
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  font-size: 1.5rem;
  color: #4CAF50;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.logout-btn:hover {
  opacity: 0.9;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.welcome-message {
  background-color: #2a2a2a;
  padding: 2rem;
  border-radius: 8px;
  margin-top: 2rem;
  text-align: center;
}

.welcome-message h2 {
  color: #4CAF50;
  margin-bottom: 1rem;
}

.welcome-message p {
  color: #888;
  font-size: 1.1rem;
}
</style> 