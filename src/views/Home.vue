<template>
  <div class="home-container">
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
          <button class="action-btn view-rooms-btn" @click="showMyRooms = true">
            <span class="btn-icon">📋</span>
            我的宿舍
          </button>
        </div>
      </div>

      <!-- 查看宿舍的模态窗口 -->
      <div class="modal-overlay" v-if="showMyRooms" @click="showMyRooms = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>我的宿舍</h3>
            <button class="close-btn" @click="showMyRooms = false">×</button>
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

export default {
  name: 'HomePage',
  components: {
    SidePanel
  },
  data() {
    return {
      username: localStorage.getItem('username') || '用户',
      isDropdownVisible: false,
      showCreateRoomModal: false,
      showMyRooms: false,
      searchQuery: '',
      avatarUrl: null,
      showCreateForm: false,
      dormForm: {
        dormName: '',
        schoolName: '',
        space: 4,  // 默认4人间
        floorCount: '',
        roomsPerFloor: ''
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
    toggleCreateForm() {
      this.showCreateForm = !this.showCreateForm;
      if (!this.showCreateForm) {
        // 重置表单
        this.dormForm = {
          dormName: '',
          schoolName: '',
          space: 4,
          floorCount: '',
          roomsPerFloor: ''
        };
      }
    },
    async handleCreateDorm() {
      try {
        // 表单验证
        if (!this.dormForm.dormName || !this.dormForm.schoolName || 
            !this.dormForm.floorCount || !this.dormForm.roomsPerFloor) {
          alert('请填写所有必要信息');
          return;
        }

        if (this.dormForm.floorCount < 1 || this.dormForm.roomsPerFloor < 1) {
          alert('楼层数和每层房间数必须大于0');
          return;
        }

        const userId = localStorage.getItem('userId');  // 使用实际的用户ID

        const response = await fetch('http://localhost:3000/api/dorm/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...this.dormForm,
            userId
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || '创建失败');
        }

        alert('宿舍创建成功！');
        this.toggleCreateForm();  // 关闭表单
        
        // TODO: 刷新宿舍列表
        
      } catch (error) {
        console.error('创建宿舍错误:', error);
        alert(error.message || '创建失败，请重试');
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
  gap: 2rem;
  margin-top: 2rem;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  position: relative;
  z-index: 1;
}

.button-wrapper {
  width: 180px;
}

.action-btn {
  width: 100%;
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 48px;
}

.create-room-btn {
  background-color: #4CAF50;
}

.view-rooms-btn {
  background-color: #2196F3;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.create-room-btn:hover {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.view-rooms-btn:hover {
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
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
  padding: 0;
  background-color: #2a2a2a;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  width: 500px;
  max-height: calc(90vh - 200px);
  overflow: hidden;
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
}

.form-header {
  position: sticky;
  top: 0;
  background-color: #2a2a2a;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #3a3a3a;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-header h3 {
  color: #4CAF50;
  margin: 0;
  font-size: 1.3rem;
  font-weight: 500;
}

.form-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 1.8rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.6rem;
  color: #ffffff;
  font-weight: 400;
  font-size: 0.95rem;
  opacity: 0.9;
}

.form-input {
  width: 100%;
  padding: 0.8rem 1rem;
  background-color: #333;
  border: 1px solid #404040;
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #4CAF50;
  background-color: #383838;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.15);
}

.form-input::placeholder {
  color: #666;
}

.radio-group {
  display: flex;
  gap: 2rem;
  margin-top: 0.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #ffffff;
  font-size: 0.95rem;
  opacity: 0.9;
}

.radio-label input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  accent-color: #4CAF50;
}

.form-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.8rem;
}

.form-group.half {
  flex: 1;
  margin-bottom: 0;
}

.form-footer {
  margin-top: 2.5rem;
  text-align: right;
  padding: 0 2rem 2rem;
  background-color: #2a2a2a;
}

.submit-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.8rem 2.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
}

.submit-btn:hover {
  background-color: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.25);
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.close-btn:hover {
  color: #fff;
  background-color: #333;
}
</style> 