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
        @edit-dorm="openEditModal"
      />
    </div>

    <div class="empty-state" v-else>
      <p>暂无创建的宿舍</p>
      <button class="create-btn" @click="$router.push('/')">创建宿舍</button>
    </div>

    <!-- 编辑宿舍模态窗口 -->
    <div class="modal-overlay" v-if="showEditModal" @click="showEditModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>编辑宿舍</h3>
          <button class="close-btn" @click="showEditModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>宿舍名称</label>
            <input 
              type="text" 
              v-model="editForm.dormName" 
              placeholder="请输入宿舍名称"
              class="form-input"
            >
          </div>

          <div class="form-group">
            <label>所属学校</label>
            <input 
              type="text" 
              v-model="editForm.schoolName" 
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
                  v-model="editForm.space"
                  name="editDormSize"
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
                v-model="editForm.floorCount" 
                min="1"
                placeholder="请输入楼层数"
                class="form-input"
              >
            </div>

            <div class="form-group half">
              <label>每层房间数</label>
              <input 
                type="number" 
                v-model="editForm.roomsPerFloor" 
                min="1"
                placeholder="请输入每层房间数"
                class="form-input"
              >
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showEditModal = false">取消</button>
          <button class="submit-btn" @click="handleUpdateDorm">保存修改</button>
        </div>
      </div>
    </div>

    <!-- 成功提示框 -->
    <div class="success-toast" v-if="showSuccessToast">
      {{ successMessage }}
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
      dorms: [],
      showEditModal: false,
      showSuccessToast: false,
      successMessage: '',
      editForm: {
        dormId: null,
        dormName: '',
        schoolName: '',
        space: 2,
        floorCount: 1,
        roomsPerFloor: 1,
        originalSpace: 2,
        originalRoomsPerFloor: 1
      }
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
    },
    openEditModal(dorm) {
      this.editForm = {
        dormId: dorm.dorm_id,
        dormName: dorm.dorm_name,
        schoolName: dorm.school_name,
        space: dorm.space,
        floorCount: dorm.floor_count,
        roomsPerFloor: dorm.rooms_per_floor,
        originalSpace: dorm.space,
        originalRoomsPerFloor: dorm.rooms_per_floor
      };
      this.showEditModal = true;
    },
    async handleUpdateDorm() {
      try {
        // 表单验证
        if (!this.editForm.dormName || !this.editForm.schoolName) {
          this.showToast('请填写宿舍名称和学校名称');
          return;
        }

        if (!this.editForm.space || !this.editForm.floorCount || !this.editForm.roomsPerFloor) {
          this.showToast('请填写宿舍容量、楼层数和每层房间数');
          return;
        }

        // 验证宿舍容量
        if (![2, 4, 6, 8].includes(Number(this.editForm.space))) {
          this.showToast('宿舍容量必须是2、4、6或8人');
          return;
        }

        // 验证数值字段为正整数
        if (this.editForm.floorCount < 1 || this.editForm.roomsPerFloor < 1) {
          this.showToast('楼层数和每层房间数必须大于0');
          return;
        }

        const userId = localStorage.getItem('userId');
        const response = await fetch(`http://localhost:3000/api/dorm/update/${this.editForm.dormId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dormName: this.editForm.dormName,
            schoolName: this.editForm.schoolName,
            space: this.editForm.space,
            floorCount: this.editForm.floorCount,
            roomsPerFloor: this.editForm.roomsPerFloor,
            userId,
            originalSpace: this.editForm.originalSpace,
            originalRoomsPerFloor: this.editForm.originalRoomsPerFloor
          })
        });

        const data = await response.json();

        if (response.ok) {
          this.showSuccessMessage('宿舍更新成功');
          this.showEditModal = false;
          // 更新本地数据
          await this.fetchCreatedDorms();
        } else {
          this.showToast(data.message || '更新失败');
        }
      } catch (error) {
        console.error('更新宿舍错误:', error);
        this.showToast('网络错误，请稍后重试');
      }
    },
    showToast(message) {
      this.successMessage = message;
      this.showSuccessToast = true;
      
      setTimeout(() => {
        this.showSuccessToast = false;
      }, 3000);
    },
    showSuccessMessage(message) {
      this.successMessage = message;
      this.showSuccessToast = true;
      setTimeout(() => {
        this.showSuccessToast = false;
      }, 3000);
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

/* 模态窗口样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #2a2a2a;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #3a3a3a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background-color: #2a2a2a;
  z-index: 1;
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
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #3a3a3a;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ccc;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  background-color: #3a3a3a;
  border: 1px solid #4a4a4a;
  border-radius: 6px;
  color: #fff;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #4CAF50;
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.radio-label {
  display: flex;
  align-items: center;
  cursor: pointer;
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
  margin-bottom: 1rem;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  background-color: #6c757d;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

.submit-btn {
  padding: 0.75rem 1.5rem;
  background-color: #4CAF50;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover {
  background-color: #45a049;
}

/* 成功提示框 */
.success-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #4CAF50;
  color: white;
  padding: 1rem 2rem;
  border-radius: 6px;
  z-index: 2000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .dorms-container {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style> 