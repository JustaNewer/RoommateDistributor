<template>
  <div class="profile-container">
    <header class="profile-header">
      <div class="header-content">
        <button class="back-btn" @click="$router.push(localePath('/'))">
          {{ $t('common.backHome') }}
        </button>
        <h1>{{ $t('profile.title') }}</h1>
        <div class="header-toggles">
          <ThemeToggle />
          <LangToggle />
        </div>
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
                {{ $t('profile.changeAvatar') }}
              </button>
              <button class="ai-avatar-btn" @click="generateAIAvatar">
                {{ $t('profile.aiAvatar') }}
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
          <h2>{{ $t('profile.basicInfo') }}</h2>
          <div class="info-item">
            <label>{{ $t('profile.username') }}</label>
            <span>{{ username }}</span>
          </div>

          <div class="info-form" v-if="userRole !== 'admin'">
            <div class="form-row">
              <label>{{ $t('profile.realName') }}</label>
              <input type="text" v-model="profileForm.real_name" :placeholder="$t('profile.realNamePlaceholder')" />
            </div>
            <div class="form-row">
              <label>{{ $t('profile.gender') }}</label>
              <select v-model="profileForm.gender">
                <option value="">{{ $t('profile.genderPlaceholder') }}</option>
                <option value="male">{{ $t('profile.male') }}</option>
                <option value="female">{{ $t('profile.female') }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>{{ $t('profile.height') }}</label>
              <div class="input-with-unit">
                <input type="number" v-model="profileForm.height" :placeholder="$t('profile.heightPlaceholder')" />
                <span class="unit">cm</span>
              </div>
            </div>
            <div class="form-row">
              <label>{{ $t('profile.weight') }}</label>
              <div class="input-with-unit">
                <input type="number" v-model="profileForm.weight" :placeholder="$t('profile.weightPlaceholder')" />
                <span class="unit">kg</span>
              </div>
            </div>

            <!-- 晚间睡眠时间段 -->
            <div class="sleep-block">
              <label class="sleep-block-label">
                <span class="time-icon">🌙</span>{{ $t('profile.sleepTime') }}
              </label>
              <div class="time-range-row">
                <div class="time-picker-wrap">
                  <input
                    type="time"
                    class="time-input"
                    v-model="profileForm.sleep_time_start"
                  />
                </div>
                <span class="range-sep">{{ $t('profile.timeTo') }}</span>
                <div class="time-picker-wrap">
                  <input
                    type="time"
                    class="time-input"
                    v-model="profileForm.sleep_time_end"
                  />
                </div>
              </div>
            </div>

            <!-- 午睡 -->
            <div class="form-row nap-row">
              <label>{{ $t('profile.hasNap') }}</label>
              <div class="nap-toggle-wrap">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="profileForm.has_nap" />
                  <span class="toggle-track">
                    <span class="toggle-thumb"></span>
                  </span>
                </label>
                <span class="nap-label-text">{{ profileForm.has_nap ? $t('profile.napYes') : $t('profile.napNo') }}</span>
              </div>
            </div>
            <transition name="slide-down">
              <div class="sleep-block" v-if="profileForm.has_nap">
                <label class="sleep-block-label">
                  <span class="time-icon">☀️</span>{{ $t('profile.napTime') }}
                </label>
                <div class="time-range-row">
                  <div class="time-picker-wrap">
                    <input
                      type="time"
                      class="time-input"
                      v-model="profileForm.nap_time_start"
                    />
                  </div>
                  <span class="range-sep">{{ $t('profile.timeTo') }}</span>
                  <div class="time-picker-wrap">
                    <input
                      type="time"
                      class="time-input"
                      v-model="profileForm.nap_time_end"
                    />
                  </div>
                </div>
              </div>
            </transition>

            <button class="save-profile-btn" @click="saveProfile" :disabled="isSavingProfile">
              {{ isSavingProfile ? $t('profile.saving') : $t('profile.saveProfile') }}
            </button>
          </div>
        </div>

        <!-- 修改密码部分 -->
        <div class="password-section">
          <h2>{{ $t('profile.changePassword') }}</h2>
          <div class="form-group">
            <div class="password-input-wrapper">
              <input
                :type="passwordVisibility.oldPassword ? 'text' : 'password'"
                v-model="passwordForm.oldPassword"
                :placeholder="$t('profile.currentPassword')"
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
                :placeholder="$t('profile.newPassword')"
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
                :placeholder="$t('profile.confirmNewPassword')"
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
            {{ $t('profile.saveChange') }}
          </button>
        </div>

        <!-- 性格测试部分（仅住户和超级账号可见） -->
        <div class="personality-section" v-if="userRole !== 'admin'">
          <h2>{{ $t('profile.personalityTest') }}</h2>
          <div class="tags-container" v-if="userTags.length > 0">
            <h3>{{ $t('profile.myTags') }}</h3>
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
          <div class="vector-container" v-if="userVector">
            <h3>{{ $t('questionnaire.title') }}</h3>
            <div class="vector-list">
              <span v-for="(v, i) in userVector" :key="i" class="vector-chip">
                Q{{ i + 1 }}: {{ v }}
              </span>
            </div>
          </div>
          <p class="test-description">{{ $t('profile.testDesc') }}</p>
          <button class="test-btn" @click="showTestChoice = true">
            {{ (userTags.length > 0 || userVector) ? $t('profile.retakeTest') : $t('profile.startTest') }}
            <span class="test-icon">🎯</span>
          </button>
        </div>

        <!-- 测试方式选择弹窗 -->
        <transition name="modal-fade">
          <div class="test-choice-overlay" v-if="showTestChoice" @click.self="showTestChoice = false">
            <div class="test-choice-modal">
              <h2>{{ $t('testChoice.title') }}</h2>
              <div class="choice-cards">
                <div class="choice-card" @click="goAIChat">
                  <div class="choice-icon">💬</div>
                  <h3>{{ $t('testChoice.aiChat') }}</h3>
                  <p>{{ $t('testChoice.aiChatDesc') }}</p>
                </div>
                <div class="choice-card" @click="goQuestionnaire">
                  <div class="choice-icon">📋</div>
                  <h3>{{ $t('testChoice.questionnaire') }}</h3>
                  <p>{{ $t('testChoice.questionnaireDesc') }}</p>
                </div>
              </div>
              <button class="close-modal-btn" @click="showTestChoice = false">
                {{ $t('common.cancel') }}
              </button>
            </div>
          </div>
        </transition>
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
import ThemeToggle from '../components/ThemeToggle.vue'
import LangToggle from '../components/LangToggle.vue';

export default {
  name: 'ProfilePage',
  components: {
    AIAvatarModal,
    LangToggle,
    ThemeToggle
  },
  data() {
    return {
      username: localStorage.getItem('username') || '用户',
      userRole: localStorage.getItem('userRole') || 'resident',
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
      userTags: [],
      userVector: null,
      showTestChoice: false,
      profileForm: {
        real_name: '',
        height: '',
        weight: '',
        gender: '',
        sleep_time_start: '',
        sleep_time_end: '',
        has_nap: false,
        nap_time_start: '',
        nap_time_end: '',
      },
      isSavingProfile: false
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
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          alert('请先登录');
          this.$router.push('/login');
          return;
        }

        // 直接使用无认证的请求，完全移除JWT令牌功能
        const response = await fetch('http://localhost:3000/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userId,
            oldPassword: this.passwordForm.oldPassword,
            newPassword: this.passwordForm.newPassword
          })
        });

        // 检查是否成功返回数据
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || '密码修改失败');
        }

        // 解析响应但不存储在未使用的变量中
        await response.json();
        
        // 成功修改密码
        alert('密码修改成功');
        // 清空表单
        this.passwordForm = {
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
      } catch (error) {
        console.error('修改密码错误:', error);
        alert('密码修改失败: ' + (error.message || '请稍后重试'));
      }
    },
    localePath(path) {
      return this.$i18n.locale === 'en' ? '/en' + path : path;
    },
    goAIChat() {
      this.showTestChoice = false;
      this.$router.push(this.localePath('/personality-test'));
    },
    goQuestionnaire() {
      this.showTestChoice = false;
      this.$router.push(this.localePath('/questionnaire-test'));
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
    },
    async fetchUserVector() {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`http://localhost:3000/api/user/${userId}/vector`);
        const data = await response.json();
        if (response.ok && data.data.user_vector) {
          this.userVector = data.data.user_vector;
        }
      } catch (error) {
        console.error('获取用户问卷向量失败:', error);
      }
    },
    async fetchProfile() {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`http://localhost:3000/api/user/${userId}/profile`);
        const data = await response.json();
        if (response.ok && data.data) {
          const d = data.data;
          this.profileForm.real_name = d.real_name || '';
          this.profileForm.height = d.height || '';
          this.profileForm.weight = d.weight || '';
          this.profileForm.gender = d.gender || '';
          this.profileForm.sleep_time_start = d.sleep_time_start || '';
          this.profileForm.sleep_time_end = d.sleep_time_end || '';
          this.profileForm.has_nap = !!d.has_nap;
          this.profileForm.nap_time_start = d.nap_time_start || '';
          this.profileForm.nap_time_end = d.nap_time_end || '';
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    },
    async saveProfile() {
      this.isSavingProfile = true;
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`http://localhost:3000/api/user/${userId}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.profileForm)
        });
        const data = await response.json();
        if (response.ok) {
          alert(this.$t('profile.saveSuccess'));
        } else {
          alert(data.message || this.$t('profile.saveFail'));
        }
      } catch (error) {
        console.error('保存用户信息失败:', error);
        alert(this.$t('profile.saveFail'));
      } finally {
        this.isSavingProfile = false;
      }
    }
  },
  mounted() {
    this.fetchAvatar();
    this.fetchUserTags();
    this.fetchUserVector();
    this.fetchProfile();
  }
}
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background-color: var(--bg-1);
  color: var(--text-1);
}

.profile-header {
  background-color: var(--bg-2);
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px var(--shadow-sm);
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.header-content h1 {
  flex: 1;
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
  background-color: var(--bg-2);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px var(--shadow-sm);
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
  border-top: 1px solid var(--border-solid);
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

.info-form {
  margin-top: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.form-row label {
  min-width: 80px;
  flex-shrink: 0;
  color: var(--text-2);
  font-size: 0.95rem;
}

.form-row input,
.form-row select {
  flex: 1;
  padding: 0.7rem 0.8rem;
  background-color: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-1);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-row input:focus,
.form-row select:focus {
  outline: none;
  border-color: #4CAF50;
}

.form-row select {
  appearance: auto;
  cursor: pointer;
}

.input-with-unit {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-with-unit input {
  flex: 1;
}

.input-with-unit .unit {
  color: var(--text-3);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.save-profile-btn {
  margin-top: 0.5rem;
  padding: 0.7rem 2rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  align-self: flex-end;
  transition: background-color 0.2s;
}

.save-profile-btn:hover:not(:disabled) {
  background-color: #43a047;
}

.save-profile-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 1rem;
}

input {
  width: 100%;
  padding: 0.8rem;
  background-color: var(--bg-3);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 1rem;
}

input::placeholder {
  color: var(--text-3);
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
  color: var(--text-3);
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
  color: var(--text-3);
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
  background-color: var(--bg-2);
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
  background-color: var(--bg-1);
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

/* ─── 问卷向量展示 ─── */
.vector-container {
  margin: 1.5rem 0;
  padding: 1rem;
  background-color: var(--bg-2);
  border-radius: 8px;
}
.vector-container h3 {
  color: #4CAF50;
  font-size: 1rem;
  margin-bottom: 1rem;
}
.vector-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.vector-chip {
  background-color: var(--bg-1);
  color: #4CAF50;
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid rgba(76,175,80,0.25);
}

/* ─── 测试方式选择弹窗 ─── */
.test-choice-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}
.test-choice-modal {
  background: var(--bg-2);
  border-radius: 20px;
  padding: 2rem;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 16px 48px rgba(0,0,0,0.3);
}
.test-choice-modal h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--text-1);
}
.choice-cards {
  display: flex;
  gap: 1rem;
}
.choice-card {
  flex: 1;
  background: var(--bg-3);
  border-radius: 14px;
  padding: 1.5rem 1.2rem;
  cursor: pointer;
  text-align: center;
  border: 2px solid transparent;
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
}
.choice-card:hover {
  border-color: #4CAF50;
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(76,175,80,0.15);
}
.choice-icon {
  font-size: 2.2rem;
  margin-bottom: 0.8rem;
}
.choice-card h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--text-1);
}
.choice-card p {
  font-size: 0.82rem;
  color: var(--text-3);
  line-height: 1.45;
}
.close-modal-btn {
  display: block;
  margin: 1.5rem auto 0;
  background: none;
  border: 1.5px solid var(--border-solid);
  color: var(--text-3);
  padding: 0.55rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: border-color 0.2s, color 0.2s;
}
.close-modal-btn:hover {
  border-color: var(--text-2);
  color: var(--text-2);
}

/* 弹窗过渡 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s;
}
.modal-fade-enter-active .test-choice-modal,
.modal-fade-leave-active .test-choice-modal {
  transition: transform 0.25s cubic-bezier(.4,0,.2,1);
}
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .test-choice-modal { transform: scale(0.92); }
.modal-fade-leave-to .test-choice-modal { transform: scale(0.92); }

@media (max-width: 480px) {
  .choice-cards { flex-direction: column; }
}

/* ─── 睡眠时间段 ─── */
.sleep-block {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.sleep-block-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.95rem;
  color: var(--text-2);
  min-width: 80px;
}
.time-range-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.range-sep {
  color: var(--text-3);
  font-size: 0.9rem;
  flex-shrink: 0;
}

/* ─── 时间选择器 ─── */
.time-picker-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0 0.8rem;
  transition: border-color 0.2s;
}
.time-picker-wrap:focus-within {
  border-color: #4CAF50;
}
.time-icon {
  font-size: 1rem;
  flex-shrink: 0;
  line-height: 1;
}
.time-input {
  flex: 1;
  padding: 0.7rem 0;
  background: transparent;
  border: none;
  color: var(--text-1);
  font-size: 0.95rem;
  width: 100%;
  cursor: pointer;
  font-family: inherit;
}
.time-input:focus {
  outline: none;
}
.time-input::-webkit-calendar-picker-indicator {
  filter: invert(0.6);
  cursor: pointer;
  border-radius: 4px;
  padding: 2px;
  transition: filter 0.2s;
}
.time-input::-webkit-calendar-picker-indicator:hover {
  filter: invert(0.4) sepia(1) saturate(3) hue-rotate(90deg);
}
.time-input::-moz-focus-inner {
  border: 0;
}

/* ─── 午睡开关 ─── */
.nap-row {
  align-items: center;
}
.nap-toggle-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.toggle-switch input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-track {
  display: block;
  width: 44px;
  height: 24px;
  background-color: var(--bg-3);
  border: 1.5px solid var(--border-solid);
  border-radius: 12px;
  transition: background-color 0.25s, border-color 0.25s;
  position: relative;
}
.toggle-switch input:checked + .toggle-track {
  background-color: #4CAF50;
  border-color: #4CAF50;
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background-color: #fff;
  border-radius: 50%;
  transition: transform 0.25s cubic-bezier(.4,0,.2,1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
}
.toggle-switch input:checked + .toggle-track .toggle-thumb {
  transform: translateX(20px);
}
.nap-label-text {
  font-size: 0.9rem;
  color: var(--text-3);
}

/* ─── slide-down 过渡 ─── */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.28s cubic-bezier(.4,0,.2,1);
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 120px;
}
</style> 