<template>
  <div class="joined-dorms">
    <header class="page-header">
      <h2>我加入的宿舍</h2>
      <button class="back-btn" @click="$router.push('/')">返回首页</button>
    </header>

    <div class="joined-dorms-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="dorms.length === 0" class="empty-state">
        <div class="empty-icon">🏠</div>
        <p>暂未加入任何宿舍</p>
        <button class="search-btn" @click="$router.push('/')">查找宿舍</button>
      </div>

      <div v-else class="dorms-container">
        <div v-for="dorm in dorms" :key="dorm.dorm_id" class="dorm-card">
          <div class="dorm-header">
            <div class="creator-info">
              <img 
                :src="dorm.creator_avatar || '/default-avatar.png'" 
                :alt="dorm.creator_name"
                class="creator-avatar"
              >
              <span class="creator-name">{{ dorm.creator_name }}</span>
            </div>
            <button class="view-btn" @click="viewDormDetail(dorm.dorm_id)">查看详情</button>
          </div>
          
          <div class="dorm-body">
            <h3 class="dorm-name">{{ dorm.dorm_name }}</h3>
            <p class="school-name">{{ dorm.school_name }}</p>
            
            <div class="room-info">
              <span class="info-label">我的房间:</span>
              <span class="room-number">{{ dorm.room_number }}房</span>
            </div>
            
            <div class="dorm-info">
              <span class="info-item">容量: {{ dorm.space }}人</span>
              <span class="info-item">楼层: {{ dorm.floor_count }}层</span>
              <span class="info-item">每层: {{ dorm.rooms_per_floor }}间</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JoinedDorms',
  data() {
    return {
      loading: true,
      dorms: []
    };
  },
  methods: {
    async fetchJoinedDorms() {
      try {
        this.loading = true;
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          this.$router.push('/login');
          return;
        }
        
        const response = await fetch(`http://localhost:3000/api/dorm/joined/${userId}`);
        const data = await response.json();
        
        if (response.ok) {
          this.dorms = data.data || [];
          console.log('已加入的宿舍:', this.dorms);
        } else {
          console.error('获取已加入宿舍失败:', data.message);
          this.showToast(data.message || '获取已加入宿舍失败');
        }
      } catch (error) {
        console.error('获取已加入宿舍错误:', error);
        this.showToast('获取已加入宿舍失败，请稍后重试');
      } finally {
        this.loading = false;
      }
    },
    viewDormDetail(dormId) {
      this.$router.push(`/dorm/${dormId}`);
    },
    showToast(message) {
      if (this.$notify) {
        this.$notify({
          type: 'error',
          title: '错误',
          message: message
        });
      } else {
        alert(message);
      }
    }
  },
  mounted() {
    this.fetchJoinedDorms();
  }
};
</script>

<style scoped>
.joined-dorms {
  min-height: 100vh;
  background-color: #1a1a1a;
  color: #ffffff;
  padding: 2rem;
}

.page-header {
  max-width: 1200px;
  margin: 0 auto 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h2 {
  color: #4CAF50;
  margin: 0;
}

.back-btn {
  padding: 0.5rem 1rem;
  background-color: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background-color: #3a3a3a;
  transform: translateY(-2px);
}

.joined-dorms-container {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #888;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #4CAF50;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #888;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.empty-icon {
  font-size: 4rem;
  color: #555;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
}

.search-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.search-btn:hover {
  background-color: #45a049;
  transform: translateY(-2px);
}

.dorms-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  padding: 1rem;
}

.dorm-card {
  background-color: #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #3a3a3a;
  cursor: pointer;
  position: relative;
}

.dorm-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.dorm-header {
  padding: 1rem;
  border-bottom: 1px solid #3a3a3a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.creator-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  background-color: #1a1a1a;
}

.creator-name {
  color: #ffffff;
  font-size: 0.9rem;
}

.view-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.view-btn:hover {
  background-color: #1976D2;
  transform: translateY(-1px);
}

.dorm-body {
  padding: 1rem;
}

.dorm-name {
  margin: 0 0 0.5rem 0;
  color: #4CAF50;
  font-size: 1.2rem;
}

.school-name {
  color: #888;
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.room-info {
  background-color: #1a1a1a;
  padding: 0.75rem;
  border-radius: 6px;
  margin: 1rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info-label {
  color: #888;
  font-size: 0.85rem;
}

.room-number {
  color: #2196F3;
  font-size: 1.1rem;
  font-weight: bold;
}

.dorm-info {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.info-item {
  color: #888;
  font-size: 0.85rem;
  background-color: #1a1a1a;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .dorms-container {
    grid-template-columns: 1fr;
  }
}
</style> 