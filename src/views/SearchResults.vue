<template>
  <div class="search-results">
    <header class="results-header">
      <button class="back-btn" @click="$router.back()">
        ← 返回
      </button>
      <h1>搜索结果:</h1>
    </header>

    <main class="results-content">
      <div v-if="loading" class="loading-state">
        正在搜索...
      </div>

      <div v-else-if="dorms.length === 0" class="no-results">
        <p>未找到匹配的宿舍</p>
        <button class="back-home-btn" @click="$router.push('/')">返回首页</button>
      </div>

      <div v-else class="dorms-grid">
        <DormCard 
          v-for="dorm in dorms" 
          :key="dorm.dorm_id" 
          :dorm="dorm"
          :inSearchResults="true"
          @dorm-deleted="handleDormDeleted"
          @join-dorm="handleJoinDorm"
        />
      </div>
    </main>
  </div>
</template>

<script>
import DormCard from '../components/DormCard.vue'

export default {
  name: 'SearchResults',
  components: {
    DormCard
  },
  data() {
    return {
      searchQuery: '',
      dorms: [],
      loading: true
    }
  },
  methods: {
    async fetchSearchResults() {
      try {
        this.loading = true;
        
        // 从URL获取搜索查询
        this.searchQuery = this.$route.query.q || '';
        
        if (!this.searchQuery) {
          this.dorms = [];
          this.loading = false;
          return;
        }
        
        // 调用API获取搜索结果
        const response = await fetch(`http://localhost:3000/api/dorm/search/${encodeURIComponent(this.searchQuery)}`);
        const data = await response.json();
        
        if (response.ok) {
          this.dorms = data.data || [];
          console.log('搜索结果:', this.dorms);
        } else {
          console.error('获取搜索结果失败:', data.message);
          this.dorms = [];
        }
      } catch (error) {
        console.error('搜索错误:', error);
        this.dorms = [];
      } finally {
        this.loading = false;
      }
    },
    handleDormDeleted(dormId) {
      // 从列表中移除被删除的宿舍
      this.dorms = this.dorms.filter(dorm => dorm.dorm_id !== dormId);
    },
    handleJoinDorm(dorm) {
      // 这里只添加前端功能，不实现后端逻辑
      alert(`您点击了加入宿舍：${dorm.dorm_name}。实际功能尚未实现。`);
    }
  },
  mounted() {
    this.fetchSearchResults();
  },
  watch: {
    // 监听路由变化，重新获取搜索结果
    '$route.query.q': function(newQuery) {
      if (newQuery !== this.searchQuery) {
        this.fetchSearchResults();
      }
    }
  }
}
</script>

<style scoped>
.search-results {
  min-height: 100vh;
  background-color: #1a1a1a;
  color: #ffffff;
  padding-bottom: 2rem;
}

.results-header {
  background-color: #2a2a2a;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  margin-bottom: 2rem;
}

.back-btn {
  background: none;
  border: 2px solid #4CAF50;
  color: #4CAF50;
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background-color: rgba(76, 175, 80, 0.1);
  transform: translateY(-1px);
}

.results-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: #888;
  font-size: 1.2rem;
}

.no-results {
  text-align: center;
  padding: 3rem;
  color: #888;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.no-results p {
  font-size: 1.2rem;
}

.back-home-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.back-home-btn:hover {
  background-color: #45a049;
  transform: translateY(-2px);
}

.dorms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

@media (max-width: 768px) {
  .dorms-grid {
    grid-template-columns: 1fr;
  }
  
  .results-header {
    padding: 1rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .results-header h1 {
    font-size: 1.2rem;
  }
}
</style> 