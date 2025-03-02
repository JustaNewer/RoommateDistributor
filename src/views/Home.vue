<template>
  <div class="home-container">
    <SystemToast 
      :show="toast.show" 
      :message="toast.message"
      :type="toast.type"
    />
    <header class="header">
      <div class="header-content">
        <h1>智能舍友分配系统</h1>
        <div class="user-info">
          <div class="avatar-container">
            <div class="avatar" @click="toggleDropdown">
              <img v-if="avatarUrl" :src="avatarUrl" alt="用户头像" class="avatar-img">
              <span v-else class="avatar-text">{{ username.charAt(0).toUpperCase() }}</span>
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
      <div class="search-section">
        <div class="search-container">
          <input 
            type="text" 
            class="search-input" 
            placeholder="搜索宿舍..."
            v-model="searchQuery"
          >
          <button class="search-btn">
            🔍
          </button>
        </div>
      </div>

      <div class="action-buttons">
        <div class="button-wrapper">
          <SidePanel v-model="showCreateRoomModal">
            <template #trigger>
              <button class="action-btn create-room-btn" @click="toggleCreateRoom">
                <span class="btn-icon">+</span>
                创建宿舍
              </button>
            </template>
            
            <div class="create-room-form">
              <div class="form-header">
                <h3>创建新宿舍</h3>
                <button class="close-btn" @click="showCreateRoomModal = false">×</button>
              </div>
              <div class="form-body">
                <div class="form-group">
                  <label>宿舍名称</label>
                  <input 
                    type="text" 
                    v-model="dormForm.dormName" 
                    placeholder="请输入宿舍名称"
                    class="form-input"
                  >
                </div>

                <div class="form-group">
                  <label>所属学校</label>
                  <input 
                    type="text" 
                    v-model="dormForm.schoolName" 
                    placeholder="请输入学校名称"
                    class="form-input"
                  >
                </div>

                <div class="form-group">
                  <label>宿舍容量</label>
                  <div class="radio-group">
                    <label class="radio-label" v-for="size in [2, 4, 6, 8]" :key="size">
                      <input 
                        type="radio" 
                        :value="size" 
                        v-model="dormForm.space"
                        name="dormSize"
                      >
                      {{ size }}人间
                    </label>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group half">
                    <label>楼层数</label>
                    <input 
                      type="number" 
                      v-model="dormForm.floorCount" 
                      min="1"
                      placeholder="请输入楼层数"
                      class="form-input"
                    >
                  </div>

                  <div class="form-group half">
                    <label>每层房间数</label>
                    <input 
                      type="number" 
                      v-model="dormForm.roomsPerFloor" 
                      min="1"
                      placeholder="请输入每层房间数"
                      class="form-input"
                    >
                  </div>
                </div>

                <div class="form-footer">
                  <button class="submit-btn" @click="handleCreateDorm">
                    创建宿舍
                  </button>
                </div>
              </div>
            </div>
          </SidePanel>
        </div>

        <div class="button-wrapper">
          <button class="action-btn joined-rooms-btn" @click="showJoinedRooms = true">
            <span class="btn-icon">🏠</span>
            我加入的宿舍
          </button>
        </div>

        <div class="button-wrapper">
          <button class="action-btn created-rooms-btn" @click="$router.push('/created-dorms')">
            <span class="btn-icon">📋</span>
            我创建的宿舍
          </button>
        </div>
      </div>

      <!-- 查看加入的宿舍的模态窗口 -->
      <div class="modal-overlay" v-if="showJoinedRooms" @click="showJoinedRooms = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>我加入的宿舍</h3>
            <button class="close-btn" @click="showJoinedRooms = false">×</button>
          </div>
          <div class="modal-body">
            <p class="placeholder-text">宿舍列表开发中...</p>
          </div>
        </div>
      </div>

      <!-- 查看创建的宿舍的模态窗口 -->
      <div class="modal-overlay" v-if="showCreatedRooms" @click="showCreatedRooms = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>我创建的宿舍</h3>
            <button class="close-btn" @click="showCreatedRooms = false">×</button>
          </div>
          <div class="modal-body">
            <p class="placeholder-text">宿舍列表开发中...</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SidePanel from '../components/SidePanel.vue'
import SystemToast from '../components/Toast.vue'

export default {
  name: 'HomePage',
  components: {
    SidePanel,
    SystemToast
  },
  data() {
    return {
      username: localStorage.getItem('username') || '用户',
      isDropdownVisible: false,
      showCreateRoomModal: false,
      showJoinedRooms: false,
      showCreatedRooms: false,
      searchQuery: '',
      avatarUrl: null,
      dormForm: {
        dormName: '',
        schoolName: '',
        space: 2,
        floorCount: 1,
        roomsPerFloor: 1
      },
      toast: {
        show: false,
        message: '',
        type: 'success'
      }
    }
  },
  methods: {
    toggleDropdown() {
      this.isDropdownVisible = !this.isDropdownVisible;
    },
    handleProfile() {
      this.$router.push('/profile');
      this.isDropdownVisible = false;
    },
    handleLogout() {
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      this.$router.push('/login');
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
    toggleCreateRoom() {
      this.showCreateRoomModal = !this.showCreateRoomModal;
    },
    showToast(message, type = 'success') {
      this.toast.show = true;
      this.toast.message = message;
      this.toast.type = type;

      // 3秒后自动关闭
      setTimeout(() => {
        this.toast.show = false;
      }, 3000);
    },
    async handleCreateDorm() {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          this.showToast('请先登录', 'error');
          return;
        }

        // 表单验证
        if (!this.dormForm.dormName || !this.dormForm.schoolName) {
          this.showToast('请填写宿舍名称和学校名称', 'error');
          return;
        }

        if (!this.dormForm.space || !this.dormForm.floorCount || !this.dormForm.roomsPerFloor) {
          this.showToast('请填写宿舍容量、楼层数和每层房间数', 'error');
          return;
        }

        const response = await fetch('http://localhost:3000/api/dorm/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...this.dormForm,
            userId
          })
        });

        const data = await response.json();

        if (response.ok) {
          this.showToast('宿舍创建成功');
          this.showCreateRoomModal = false;
          // 重置表单
          this.dormForm = {
            dormName: '',
            schoolName: '',
            space: 2,
            floorCount: 1,
            roomsPerFloor: 1
          };
        } else {
          this.showToast(data.message || '创建失败', 'error');
        }
      } catch (error) {
        console.error('创建宿舍错误:', error);
        this.showToast('网络错误，请稍后重试', 'error');
      }
    }
  },
  async mounted() {
    // 获取用户头像
    await this.fetchAvatar();
    
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
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 80px);
  position: relative;
  overflow: hidden;
}

.search-section {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.search-container {
  width: 100%;
  max-width: 600px;
  display: flex;
  gap: 0.5rem;
  padding: 0 1rem;
}

.search-input {
  flex: 1;
  padding: 1rem 1.5rem;
  background-color: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 12px;
  color: #ffffff;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
  background-color: #333;
}

.search-btn {
  padding: 1rem 1.5rem;
  background-color: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 12px;
  color: #888;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1.2rem;
}

.search-btn:hover {
  background-color: #3a3a3a;
  color: #4CAF50;
  border-color: #4CAF50;
}

.action-buttons {
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  position: relative;
  z-index: 1;
}

.button-wrapper {
  width: 200px;
}

.action-btn {
  width: 100%;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 52px;
  white-space: nowrap;
}

.create-room-btn {
  background-color: #4CAF50;
}

.joined-rooms-btn {
  background-color: #2196F3;
}

.created-rooms-btn {
  background-color: #FF9800;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.create-room-btn:hover {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.joined-rooms-btn:hover {
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
}

.created-rooms-btn:hover {
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.2);
}

.btn-icon {
  font-size: 1.2rem;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #2a2a2a;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #3a3a3a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  color: #4CAF50;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 1.5rem;
}

.placeholder-text {
  text-align: center;
  color: #888;
  font-style: italic;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.create-room-form {
  padding: 2rem;
  background-color: #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  width: 500px;
  max-height: calc(80vh - 120px);
  overflow-y: auto;
  margin-top: 1rem;
}

.form-header {
  position: sticky;
  top: 0;
  background-color: #2a2a2a;
  padding: 1rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 1px solid #3a3a3a;
  z-index: 1;
}

.form-header h3 {
  color: #4CAF50;
  margin: 0;
  font-size: 1.4rem;
}

.form-body {
  padding: 1rem;
  min-height: 200px;
  position: relative;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  background-color: #3a3a3a;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  color: #ffffff;
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-label {
  display: flex;
  align-items: center;
}

.radio-label input {
  margin-right: 0.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-group.half {
  flex: 1;
}

.form-footer {
  text-align: right;
  margin-top: 1rem;
}

.submit-btn {
  padding: 0.75rem 1.5rem;
  background-color: #4CAF50;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover {
  background-color: #45a049;
}
</style> 