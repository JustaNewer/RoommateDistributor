<!-- 宿舍卡片组件 -->
<template>
  <div>
    <div class="dorm-card" @click="navigateToDetail">
      <div class="dorm-header">
        <div class="creator-info">
          <img 
            :src="dorm.creator_avatar || '/default-avatar.png'" 
            :alt="dorm.creator_name"
            class="creator-avatar"
          >
          <span class="creator-name">{{ dorm.creator_name }}</span>
        </div>
        <div class="action-buttons">
          <button 
            class="edit-btn" 
            @click.stop="$emit('edit-dorm', dorm)"
            v-if="canDelete"
          >
            编辑
          </button>
          <button 
            class="delete-btn" 
            @click.stop="showConfirmDialog = true"
            v-if="canDelete"
          >
            删除
          </button>
        </div>
      </div>
      
      <div class="dorm-body">
        <h3 class="dorm-name">{{ dorm.dorm_name }}</h3>
        <p class="school-name">{{ dorm.school_name }}</p>
        
        <div class="hash-container">
          <span class="hash-label">哈希码：</span>
          <div class="hash-value">
            <span class="hash">{{ truncatedHash }}</span>
            <button class="copy-btn" @click.stop="copyHash" :class="{ copied: isCopied }">
              {{ isCopied ? '已复制' : '复制' }}
            </button>
          </div>
        </div>

        <div class="dorm-info">
          <span class="info-item">容量: {{ dorm.space }}人</span>
          <span class="info-item">楼层: {{ dorm.floor_count }}层</span>
          <span class="info-item">每层: {{ dorm.rooms_per_floor }}间</span>
        </div>
      </div>
    </div>

    <!-- 自定义确认对话框 -->
    <div class="confirm-dialog-overlay" v-if="showConfirmDialog" @click.stop="showConfirmDialog = false">
      <div class="confirm-dialog" @click.stop>
        <h3>确认删除</h3>
        <p>确定要删除这个宿舍吗？此操作不可撤销。</p>
        <div class="confirm-buttons">
          <button class="cancel-btn" @click="showConfirmDialog = false">取消</button>
          <button class="confirm-btn" @click="handleDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 添加成功提示框 -->
    <transition name="fade">
      <div class="success-toast" v-if="showSuccessToast">
        <span>删除成功</span>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'DormCard',
  props: {
    dorm: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      isCopied: false,
      showSuccessToast: false,
      showConfirmDialog: false
    }
  },
  computed: {
    truncatedHash() {
      if (!this.dorm.hash) return '无哈希码';
      return this.dorm.hash.slice(0, 8) + '...' + this.dorm.hash.slice(-8);
    },
    canDelete() {
      const userId = localStorage.getItem('userId');
      console.log('Current userId:', userId);
      console.log('Dorm creator_user_id:', this.dorm.creator_user_id);
      return userId && Number(userId) === this.dorm.creator_user_id;
    }
  },
  methods: {
    async copyHash() {
      if (!this.dorm.hash) return;
      
      try {
        await navigator.clipboard.writeText(this.dorm.hash);
        this.isCopied = true;
        setTimeout(() => {
          this.isCopied = false;
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
      }
    },
    navigateToDetail() {
      this.$router.push(`/dorm/${this.dorm.dorm_id}`);
    },
    confirmDelete() {
      this.showConfirmDialog = true;
    },
    async handleDelete() {
      try {
        const response = await fetch(`http://localhost:3000/api/dorm/${this.dorm.dorm_id}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        
        // 关闭确认对话框
        this.showConfirmDialog = false;
        
        if (response.ok) {
          // 显示成功提示框
          this.showSuccessToast = true;
          
          // 3秒后自动关闭提示框并通知父组件
          setTimeout(() => {
            this.showSuccessToast = false;
            this.$emit('dorm-deleted', this.dorm.dorm_id);
          }, 2500);
        } else {
          alert(data.message || '删除失败');
        }
      } catch (error) {
        console.error('删除宿舍错误:', error);
        alert('删除失败，请稍后重试');
      }
    }
  }
}
</script>

<style scoped>
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

.action-buttons {
  display: flex;
  gap: 8px;
}

.edit-btn {
  background-color: #FFC107;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.edit-btn:hover {
  background-color: #FFB300;
  transform: translateY(-1px);
}

.delete-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.delete-btn:hover {
  background-color: #c82333;
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

.hash-container {
  background-color: #1a1a1a;
  padding: 0.75rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.hash-label {
  color: #888;
  font-size: 0.85rem;
  display: block;
  margin-bottom: 0.5rem;
}

.hash-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.hash {
  color: #2196F3;
  font-family: monospace;
  font-size: 0.9rem;
}

.copy-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background-color 0.2s;
}

.copy-btn:hover {
  background-color: #1976D2;
}

.copy-btn.copied {
  background-color: #4CAF50;
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

/* 成功提示框样式 */
.success-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #4CAF50;
  color: white;
  padding: 12px 24px;
  border-radius: 4px;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

/* 过渡效果 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 自定义确认对话框样式 */
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}

.confirm-dialog {
  background-color: #2a2a2a;
  border-radius: 8px;
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.confirm-dialog h3 {
  color: #dc3545;
  margin-top: 0;
  margin-bottom: 1rem;
}

.confirm-dialog p {
  color: #fff;
  margin-bottom: 1.5rem;
}

.confirm-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.cancel-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

.confirm-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.confirm-btn:hover {
  background-color: #c82333;
}
</style> 