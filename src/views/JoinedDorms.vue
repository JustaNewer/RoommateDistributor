<template>
  <div class="joined-dorms">
    <header class="page-header">
      <h2>{{ $t('joinedDorms.title') }}</h2>
      <div class="header-toggles">
        <ThemeToggle />
        <LangToggle />
      </div>
      <button class="back-btn" @click="$router.push(localePath('/'))">{{ $t('common.backHome') }}</button>
    </header>

    <div class="joined-dorms-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>{{ $t('joinedDorms.loading') }}</p>
      </div>

      <div v-else-if="dorms.length === 0" class="empty-state">
        <div class="empty-icon">🏠</div>
        <p>{{ $t('joinedDorms.noDorms') }}</p>
        <button class="search-btn" @click="$router.push(localePath('/'))">{{ $t('joinedDorms.findDorm') }}</button>
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
            <button class="view-btn" @click="viewDormDetail(dorm.dorm_id)">{{ $t('joinedDorms.viewDetail') }}</button>
          </div>
          
          <div class="dorm-body">
            <h3 class="dorm-name">{{ dorm.dorm_name }}</h3>
            <p class="school-name">{{ dorm.school_name }}</p>
            
            <div class="room-info">
              <span class="info-label">{{ $t('joinedDorms.myRoom') }}</span>
              <span class="room-number">{{ dorm.room_number }}{{ $i18n.locale === 'en' ? '' : '房' }}</span>
            </div>
            
            <div class="dorm-info">
              <span class="info-item">{{ $t('joinedDorms.capacity', { n: dorm.space }) }}</span>
              <span class="info-item">{{ $t('joinedDorms.floors', { n: dorm.floor_count }) }}</span>
              <span class="info-item">{{ $t('joinedDorms.roomsPerFloor', { n: dorm.rooms_per_floor }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ThemeToggle from '../components/ThemeToggle.vue'
import LangToggle from '../components/LangToggle.vue'

export default {
  name: 'JoinedDorms',
  components: { LangToggle,
    ThemeToggle
  },
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
    localePath(path) {
      return this.$i18n.locale === 'en' ? '/en' + path : path;
    },
    viewDormDetail(dormId) {
      this.$router.push(this.localePath(`/dorm/${dormId}`));
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
  background-color: var(--bg-1);
  color: var(--text-1);
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
  background-color: var(--bg-2);
  border: 1px solid var(--border-solid);
  border-radius: 8px;
  color: var(--text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background-color: var(--bg-3);
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
  color: var(--text-3);
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
  color: var(--text-3);
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
  background-color: var(--bg-2);
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid var(--border-solid);
  cursor: pointer;
  position: relative;
}

.dorm-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px var(--shadow-sm);
}

.dorm-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-solid);
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
  background-color: var(--bg-1);
}

.creator-name {
  color: var(--text-1);
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
  color: var(--text-3);
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.room-info {
  background-color: var(--bg-1);
  padding: 0.75rem;
  border-radius: 6px;
  margin: 1rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info-label {
  color: var(--text-3);
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
  color: var(--text-3);
  font-size: 0.85rem;
  background-color: var(--bg-1);
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