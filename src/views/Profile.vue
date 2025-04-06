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
            <div class="avatar-buttons">
              <button class="change-avatar-btn" @click="triggerFileInput">
                更换头像
              </button>
              <button class="ai-avatar-btn" @click="generateAIAvatar">
                AI生成头像
              </button>
            </div>
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
            <div class="password-input-wrapper">
              <input
                :type="passwordVisibility.oldPassword ? 'text' : 'password'"
                v-model="passwordForm.oldPassword"
                placeholder="当前密码"
              />
              <button 
                class="toggle-password-btn"
                @click="togglePasswordVisibility('oldPassword')"
                type="button"
              >
                {{ passwordVisibility.oldPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <div class="password-input-wrapper">
              <input
                :type="passwordVisibility.newPassword ? 'text' : 'password'"
                v-model="passwordForm.newPassword"
                placeholder="新密码"
              />
              <button 
                class="toggle-password-btn"
                @click="togglePasswordVisibility('newPassword')"
                type="button"
              >
                {{ passwordVisibility.newPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <div class="password-input-wrapper">
              <input
                :type="passwordVisibility.confirmPassword ? 'text' : 'password'"
                v-model="passwordForm.confirmPassword"
                placeholder="确认新密码"
              />
              <button 
                class="toggle-password-btn"
                @click="togglePasswordVisibility('confirmPassword')"
                type="button"
              >
                {{ passwordVisibility.confirmPassword ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>
          <button class="submit-btn" @click="handlePasswordChange">
            确认修改
          </button>
        </div>

        <!-- 性格测试部分 -->
        <div class="personality-section">
          <h2>性格爱好测试</h2>
          <div class="tags-container" v-if="userTags.length > 0">
            <h3>我的性格标签</h3>
            <div class="tags-list">
              <span 
                v-for="tag in userTags" 
                :key="tag" 
                class="tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>
          <p class="test-description">
            完成性格测试问卷，帮助我们更好地为您匹配室友。
            测试采用对话形式，轻松有趣地了解您的性格特征。
          </p>
          <button class="test-btn" @click="startPersonalityTest">
            {{ userTags.length > 0 ? '重新测试' : '开始测试' }}
            <span class="test-icon">🎯</span>
          </button>
        </div>
      </div>
    </main>

    <AIAvatarModal
      v-if="showAIModal"
      @close="showAIModal = false"
      @avatarGenerated="handleAIAvatarGenerated"
    />
  </div>
</template>

<script>
import AIAvatarModal from '../components/AIAvatarModal.vue';

export default {
  name: 'ProfilePage',
  components: {
    AIAvatarModal
  },
  data() {
    return {
      username: localStorage.getItem('username') || '用户',
      avatarUrl: null,
      showAIModal: false,
      passwordForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      passwordVisibility: {
        oldPassword: false,
        newPassword: false,
        confirmPassword: false
      },
      userTags: []
    }
  },
  methods: {
    togglePasswordVisibility(field) {
      this.passwordVisibility[field] = !this.passwordVisibility[field];
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    async fetchAvatar() {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`http://localhost:3000/api/avatar/${userId}`);
        const data = await response.json();
        
        if (response.ok && data.data.avatarUrl) {
          this.avatarUrl = data.data.avatarUrl;
        }
      } catch (error) {
        console.error('获取头像失败:', error);
      }
    },
    async handleAvatarChange(event) {
      const file = event.target.files[0];
      if (file) {
        try {
          const formData = new FormData();
          formData.append('avatar', file);
          formData.append('userId', localStorage.getItem('userId'));

          const response = await fetch('http://localhost:3000/api/avatar/upload', {
            method: 'POST',
            body: formData
          });

          const data = await response.json();

          if (response.ok) {
            this.avatarUrl = data.data.avatarUrl;
            alert('头像上传成功');
          } else {
            alert(data.message || '头像上传失败');
          }
        } catch (error) {
          console.error('上传头像错误:', error);
          alert('网络错误，请稍后重试');
        }
      }
    },
    async handlePasswordChange() {
      // 表单验证
      if (!this.passwordForm.oldPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
        alert('请填写所有密码字段');
        return;
      }
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: localStorage.getItem('userId'),
            oldPassword: this.passwordForm.oldPassword,
            newPassword: this.passwordForm.newPassword
          })
        });

        const data = await response.json();

        if (response.ok) {
          alert('密码修改成功');
          // 清空表单
          this.passwordForm = {
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
          };
        } else {
          alert(data.message || '密码修改失败');
        }
      } catch (error) {
        console.error('修改密码错误:', error);
        alert('网络错误，请稍后重试');
      }
    },
    startPersonalityTest() {
      // TODO: 跳转到性格测试页面
      this.$router.push('/personality-test');
    },
    generateAIAvatar() {
      this.showAIModal = true;
    },
    handleAIAvatarGenerated(avatarUrl) {
      this.avatarUrl = avatarUrl;
    },
    async fetchUserTags() {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`http://localhost:3000/api/user/${userId}/tags`);
        const data = await response.json();
        
        if (response.ok && data.data.user_tags) {
          this.userTags = data.data.user_tags;
        }
      } catch (error) {
        console.error('获取用户标签失败:', error);
      }
    }
  },
  mounted() {
    this.fetchAvatar();
    this.fetchUserTags();
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
  border: 2px solid #4CAF50;
  color: #4CAF50;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.back-btn:hover {
  background-color: rgba(76, 175, 80, 0.1);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
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

.avatar-buttons {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
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

.ai-avatar-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.ai-avatar-btn:hover {
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

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.toggle-password-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 1.2rem;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.toggle-password-btn:hover {
  color: #4CAF50;
}

.password-input-wrapper input {
  padding-right: 40px;
}

.tags-container {
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: #2a2a2a;
  border-radius: 8px;
}

.tags-container h3 {
  color: #4CAF50;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background-color: #1a1a1a;
  color: #2196F3;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  border: 1px solid #2196F3;
  transition: all 0.2s;
}

.tag:hover {
  background-color: #2196F3;
  color: white;
}

.test-btn {
  margin-top: 1rem;
}
</style> 