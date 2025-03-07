<template>
  <div class="created-dorms">
    <header class="page-header">
      <h2>我创建的宿舍</h2>
      <button class="back-btn" @click="$router.push('/')">返回首页</button>
    </header>

    <div class="dorms-container" v-if="dorms.length > 0">
      <DormCard 
        v-for="dorm in dorms" 
        :key="dorm.dorm_id" 
        :dorm="dorm"
        class="dorm-card-item"
        @dorm-deleted="handleDormDeleted"
      />
    </div>

    <div class="empty-state" v-else>
      <p>暂无创建的宿舍</p>
      <button class="create-btn" @click="$router.push('/')">创建宿舍</button>
    </div>
  </div>
</template>

<script>
import DormCard from '../components/DormCard.vue'

export default {
  name: 'CreatedDorms',
  components: {
    DormCard
  },
  data() {
    return {
      dorms: []
    }
  },
  methods: {
    async fetchCreatedDorms() {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          this.$router.push('/login');
          return;
        }

        const response = await fetch(`http://localhost:3000/api/dorm/created/${userId}`);
        const data = await response.json();

        if (response.ok) {
          this.dorms = data.data;
        } else {
          console.error('获取宿舍列表失败:', data.message);
        }
      } catch (error) {
        console.error('获取宿舍列表错误:', error);
      }
    },
    handleDormDeleted(dormId) {
      this.dorms = this.dorms.filter(dorm => dorm.dorm_id !== dormId);
    }
  },
  mounted() {
    this.fetchCreatedDorms();
  }
}
</script>

<style scoped>
.created-dorms {
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

.dorms-container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  padding: 1rem;
}

.dorm-card-item {
  height: 100%;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #888;
}

.create-btn {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background-color: #4CAF50;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.create-btn:hover {
  background-color: #45a049;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .dorms-container {
    grid-template-columns: 1fr;
  }
}
</style> 