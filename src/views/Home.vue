<template>
  <div class="home-container">
    <header class="header">
      <div class="header-content">
        <h1>智能舍友分配系统</h1>
        <div class="user-info">
          <div class="avatar-container">
            <div class="avatar" @click="toggleDropdown">
              <span class="avatar-text">{{ username.charAt(0).toUpperCase() }}</span>
            </div>
            <!-- 下拉菜单 -->
            <div class="dropdown-menu" v-show="isDropdownVisible">
              <div class="dropdown-item" @click="handleProfile">
                <i class="menu-icon">👤</i>
                个人资料
              </div>
              <div class="dropdown-item" @click="handleLogout">
                <i class="menu-icon">🚪</i>
                退出登录
              </div>
            </div>
          </div>
          <span>欢迎, {{ username }}</span>
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
      username: localStorage.getItem('username') || '用户',
      isDropdownVisible: false
    }
  },
  methods: {
    toggleDropdown() {
      this.isDropdownVisible = !this.isDropdownVisible;
    },
    handleProfile() {
      // 跳转到个人资料页面
      this.$router.push('/profile');
      this.isDropdownVisible = false;
    },
    handleLogout() {
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      this.$router.push('/login');
    }
  },
  mounted() {
    // 点击页面其他地方时关闭下拉菜单
    document.addEventListener('click', (e) => {
      const avatarContainer = document.querySelector('.avatar-container');
      if (avatarContainer && !avatarContainer.contains(e.target)) {
        this.isDropdownVisible = false;
      }
    });
  },
  beforeUnmount() {
    // 组件销毁前移除事件监听
    document.removeEventListener('click', this.handleClickOutside);
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

.avatar-container {
  position: relative;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #4CAF50;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  cursor: pointer;
  transition: transform 0.2s;
}

.avatar:hover {
  transform: scale(1.05);
}

.dropdown-menu {
  position: absolute;
  top: 120%;
  left: 0;
  background-color: #2a2a2a;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  min-width: 150px;
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
  color: #ffffff;
}

.dropdown-item:hover {
  background-color: #3a3a3a;
}

.menu-icon {
  margin-right: 8px;
  font-size: 1.1rem;
}

.avatar-text {
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
}
</style> 