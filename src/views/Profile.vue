<template>
  <div class="profile-container">
    <header class="profile-header">
      <div class="header-content">
        <button class="back-btn" @click="$router.push('/home')">
          ← 返回主页
        </button>
        <h1>个人资料</h1>
      </div>
    </header>

    <main class="profile-content">
      <div class="profile-card">
        <!-- 头像部分 -->
        <div class="avatar-section">
          <div class="avatar-wrapper">
            <div class="avatar">
              <span v-if="!avatarUrl" class="avatar-text">{{ username.charAt(0).toUpperCase() }}</span>
              <img v-else :src="avatarUrl" alt="用户头像" />
            </div>
            <button class="change-avatar-btn" @click="triggerFileInput">
              更换头像
            </button>
            <input
              type="file"
              ref="fileInput"
              style="display: none"
              accept="image/*"
              @change="handleAvatarChange"
            />
          </div>
        </div>

        <!-- 基本信息部分 -->
        <div class="info-section">
          <h2>基本信息</h2>
          <div class="info-item">
            <label>用户名</label>
            <span>{{ username }}</span>
          </div>
        </div>

        <!-- 修改密码部分 -->
        <div class="password-section">
          <h2>修改密码</h2>
          <div class="form-group">
            <input
              type="password"
              v-model="passwordForm.oldPassword"
              placeholder="当前密码"
            />
          </div>
          <div class="form-group">
            <input
              type="password"
              v-model="passwordForm.newPassword"
              placeholder="新密码"
            />
          </div>
          <div class="form-group">
            <input
              type="password"
              v-model="passwordForm.confirmPassword"
              placeholder="确认新密码"
            />
          </div>
          <button class="submit-btn" @click="handlePasswordChange">
            确认修改
          </button>
        </div>

        <!-- 性格测试部分 -->
        <div class="personality-section">
          <h2>性格爱好测试</h2>
          <p class="test-description">
            完成性格测试问卷，帮助我们更好地为您匹配室友。
            测试采用对话形式，轻松有趣地了解您的性格特征。
          </p>
          <button class="test-btn" @click="startPersonalityTest">
            开始测试
            <span class="test-icon">🎯</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'ProfilePage',
  data() {
    return {
      username: localStorage.getItem('username') || '用户',
      avatarUrl: null,
      passwordForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    handleAvatarChange(event) {
      const file = event.target.files[0];
      if (file) {
        // TODO: 实现头像上传逻辑
        const reader = new FileReader();
        reader.onload = (e) => {
          this.avatarUrl = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    },
    handlePasswordChange() {
      // TODO: 实现密码修改逻辑
      if (!this.passwordForm.oldPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
        alert('请填写所有密码字段');
        return;
      }
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
      }
      console.log('修改密码', this.passwordForm);
    },
    startPersonalityTest() {
      // TODO: 跳转到性格测试页面
      this.$router.push('/personality-test');
    }
  }
}
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background-color: #1a1a1a;
  color: #ffffff;
}

.profile-header {
  background-color: #2a2a2a;
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.back-btn {
  background: none;
  border: none;
  color: #4CAF50;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: rgba(76, 175, 80, 0.1);
}

.profile-content {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 2rem;
}

.profile-card {
  background-color: #2a2a2a;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.avatar-section {
  text-align: center;
  margin-bottom: 2rem;
}

.avatar-wrapper {
  display: inline-block;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: #4CAF50;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-text {
  color: white;
  font-size: 3rem;
  font-weight: bold;
}

.change-avatar-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.change-avatar-btn:hover {
  opacity: 0.9;
}

.info-section,
.password-section,
.personality-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #3a3a3a;
}

h2 {
  color: #4CAF50;
  margin-bottom: 1.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.form-group {
  margin-bottom: 1rem;
}

input {
  width: 100%;
  padding: 0.8rem;
  background-color: #3a3a3a;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 1rem;
}

input::placeholder {
  color: #888;
}

.submit-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.8rem 2rem;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: 1rem;
}

.submit-btn:hover {
  opacity: 0.9;
}

.test-description {
  color: #888;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.test-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  font-size: 1.1rem;
}

.test-btn:hover {
  transform: translateY(-2px);
  opacity: 0.9;
}

.test-icon {
  font-size: 1.2rem;
}
</style> 