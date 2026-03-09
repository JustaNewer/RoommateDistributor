<template>
  <div class="created-dorms">
    <header class="page-header">
      <h2>{{ $t('createdDorms.title') }}</h2>
      <div class="header-toggles">
        <ThemeToggle />
        <LangToggle />
      </div>
      <button class="back-btn" @click="$router.push(localePath('/'))">{{ $t('common.backHome') }}</button>
    </header>

    <div class="created-dorms-container">
      <div class="instruction-box">
        <div class="instruction-icon">💡</div>
        <div class="instruction-content">
          <h3>{{ $t('createdDorms.smartAssign') }}</h3>
          <p>{{ $t('createdDorms.smartAssignDesc') }}</p>
        </div>
      </div>

      <div class="dorms-container" v-if="dorms.length > 0">
        <DormCard 
          v-for="dorm in dorms" 
          :key="dorm.dorm_id" 
          :dorm="dorm"
          class="dorm-card-item"
          @dorm-deleted="handleDormDeleted"
          @edit-dorm="openEditModal"
          @manage-applications="handleManageApplications"
        >
          <div class="dorm-actions">
            <button class="action-btn btn-applications" @click.stop="showApplications(dorm)">
              {{ $t('createdDorms.applications') }}
            </button>
            <button class="action-btn btn-rooms" @click.stop="handleViewRooms()">
              {{ $t('createdDorms.viewRooms') }}
            </button>
          </div>
        </DormCard>
      </div>

      <div class="empty-state" v-else>
        <p>{{ $t('createdDorms.noDorms') }}</p>
        <button class="create-btn" @click="$router.push(localePath('/'))">{{ $t('createdDorms.createDorm') }}</button>
      </div>
    </div>

    <!-- 编辑宿舍模态窗口 -->
    <div class="modal-overlay" v-if="showEditModal" @click="showEditModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ $t('createdDorms.editDorm') }}</h3>
          <button class="close-btn" @click="showEditModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>{{ $t('createdDorms.dormName') }}</label>
            <input 
              type="text" 
              v-model="editForm.dormName" 
              :placeholder="$t('createdDorms.dormNamePlaceholder')"
              class="form-input"
            >
          </div>

          <div class="form-group">
            <label>{{ $t('createdDorms.school') }}</label>
            <input 
              type="text" 
              v-model="editForm.schoolName" 
              :placeholder="$t('createdDorms.schoolPlaceholder')"
              class="form-input"
            >
          </div>

          <div class="form-group">
            <label>{{ $t('createdDorms.capacity') }}</label>
            <div class="radio-group">
              <label class="radio-label" v-for="size in [2, 4, 6, 8]" :key="size">
                <input 
                  type="radio" 
                  :value="size" 
                  v-model="editForm.space"
                  name="editDormSize"
                >
                {{ size }}{{ $t('createdDorms.personRoom') }}
              </label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>{{ $t('createdDorms.floors') }}</label>
              <input 
                type="number" 
                v-model="editForm.floorCount" 
                min="1"
                max="30"
                class="form-input"
              >
            </div>

            <div class="form-group half">
              <label>{{ $t('createdDorms.roomsPerFloor') }}</label>
              <input 
                type="number" 
                v-model="editForm.roomsPerFloor" 
                min="1"
                max="100"
                class="form-input"
              >
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showEditModal = false">{{ $t('common.cancel') }}</button>
          <button class="submit-btn" @click="handleUpdateDorm">{{ $t('createdDorms.saveEdit') }}</button>
        </div>
      </div>
    </div>

    <!-- 成功提示框 -->
    <div class="success-toast" v-if="showSuccessToast">
      {{ successMessage }}
    </div>

    <!-- 申请管理模态窗口 -->
    <div class="modal-overlay" v-if="showApplicationsModal" @click="showApplicationsModal = false">
      <div class="modal-content applications-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ $t('createdDorms.applyManage', { name: currentDorm ? currentDorm.dorm_name : '' }) }}</h3>
          <button class="close-btn" @click="showApplicationsModal = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="loadingApplications" class="loading-applications">
            {{ $t('createdDorms.loadingApps') }}
          </div>
          <div v-else-if="applications.length === 0" class="empty-applications">
            {{ $t('createdDorms.noApplications') }}
          </div>
          <div v-else class="applications-list">
            <div class="top-actions">
              <div class="applications-header" v-if="applications.length > 0">
                <div class="applications-count">{{ $t('createdDorms.pendingApps', { count: applications.length }) }}</div>
                <div class="applications-actions">
                  <button 
                    class="assign-roommates-btn" 
                    @click="handleAssignRoommates()"
                    :disabled="isAssigning"
                    :class="{ 'loading': isAssigning }"
                  >
                    <span v-if="isAssigning">
                      <i class="btn-icon">⏳</i> {{ $t('createdDorms.assigning') }}
                    </span>
                    <span v-else>
                      <i class="btn-icon">⚙️</i> {{ $t('createdDorms.assignRoommates') }}
                    </span>
                  </button>
                  <button class="view-rooms-btn" @click="handleViewRooms()">
                    <i class="btn-icon">🏠</i> {{ $t('createdDorms.viewRooms') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="application-item" v-for="app in applications" :key="app.application_id">
              <div class="user-info">
                <img :src="app.avatar_url || '/default-avatar.png'" class="user-avatar" :alt="app.username">
                <div class="user-details">
                  <h4>{{ app.username }}</h4>
                  <div class="user-tags" v-if="app.user_tags">
                    <span v-for="(tag, index) in formatTags(app.user_tags)" :key="index" class="tag">
                      #{{ tag }}
                    </span>
                  </div>
                  <div class="application-time">
                    申请时间: {{ formatDate(app.application_time) }}
                  </div>
                </div>
              </div>
              <div class="application-actions">
                <button class="reject-btn" @click="handleApplicationAction(app.application_id, 'rejected')">
                  <i class="icon">✕</i> 拒绝申请
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分配结果模态窗口 -->
    <div class="modal-overlay" v-if="showAssignmentResults" @click="closeAssignmentResults">
      <div class="modal-content assignment-results" @click.stop>
        <div class="modal-header">
          <h3>舍友分配结果</h3>
          <button class="close-btn" @click="closeAssignmentResults">×</button>
        </div>
        <div class="modal-body">
          <div v-if="Object.keys(roomAssignments).length === 0" class="empty-assignment-results">
            暂无分配结果
          </div>
          <div v-else class="assignment-results-list">
            <div class="assignment-result-summary">
              <div class="result-icon">✓</div>
              <div class="result-text">
                <h4>智能分配完成</h4>
                <p>已根据用户个性标签完成舍友智能分配</p>
              </div>
            </div>
            
            <div v-for="(userIds, roomId) in roomAssignments" :key="roomId" class="room-assignment-card">
              <div class="room-header">
                <span class="room-number">{{ getRoomNumber(roomId) }}</span>
                <span class="occupants-count">{{ userIds.length }}人</span>
              </div>
              
              <div class="user-list">
                <div v-for="userId in userIds" :key="userId" class="user-item">
                  <div class="user-avatar">{{ getUsernameById(userId).charAt(0) }}</div>
                  <div class="user-details">
                    <span class="user-name">{{ getUsernameById(userId) }}</span>
                    <span class="user-tags">{{ getUserTagsById(userId) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 房间居住情况模态窗口 -->
    <div class="modal-overlay" v-if="showRoomOccupants" @click="closeRoomOccupants">
      <div class="modal-content room-occupants" @click.stop>
        <div class="modal-header">
          <h3>房间居住情况 - {{ currentDorm ? currentDorm.dorm_name : '' }}</h3>
          <button class="close-btn" @click="closeRoomOccupants">×</button>
        </div>
        <div class="modal-body">
          <div v-if="loadingRoomOccupants" class="loading-room-occupants">
            正在加载房间信息...
          </div>
          <div v-else-if="roomOccupants.length === 0" class="empty-room-occupants">
            暂无房间信息
          </div>
          <div v-else class="room-occupants-list">
            <div class="room-occupant-item" v-for="room in roomOccupants" :key="room.room_id">
              <div class="room-info">
                <span class="room-number">房间 {{ room.room_number }}</span>
                <span class="occupants-count">{{ room.occupants.length }}人</span>
              </div>
              <div class="occupants-list">
                <div v-if="room.occupants.length === 0" class="empty-occupants">
                  暂无入住人员
                </div>
                <div 
                  v-else 
                  class="occupant-item" 
                  v-for="occupant in room.occupants" 
                  :key="occupant.user_id"
                >
                  <div class="user-avatar">{{ occupant.username.charAt(0) }}</div>
                  <div class="user-details">
                    <span class="user-name">{{ occupant.username }}</span>
                    <span class="user-tags">{{ occupant.user_tags || '无标签' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add a loading progress overlay -->
    <div class="progress-overlay" v-if="isAssigning">
      <div class="progress-container">
        <h3>正在智能分配舍友</h3>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: assignProgress + '%' }"></div>
        </div>
        <p>{{ assignProgressText }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import DormCard from '../components/DormCard.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import LangToggle from '../components/LangToggle.vue'

export default {
  name: 'CreatedDorms',
  components: {
    DormCard,
    LangToggle,
    ThemeToggle
  },
  data() {
    return {
      dorms: [],
      showEditModal: false,
      showApplicationsModal: false,
      showSuccessToast: false,
      successMessage: '',
      currentDorm: null,
      applications: [],
      loadingApplications: false,
      editForm: {
        dormId: null,
        dormName: '',
        schoolName: '',
        space: 2,
        floorCount: 1,
        roomsPerFloor: 1,
        originalSpace: 2,
        originalRoomsPerFloor: 1
      },
      roomAssignments: {},
      showAssignmentResults: false,
      roomData: [],
      loadingAssignmentResults: false,
      showRoomOccupants: false,
      roomOccupants: [],
      loadingRoomOccupants: false,
      isAssigning: false,
      assignProgress: 0,
      assignProgressText: ''
    }
  },
  methods: {
    localePath(path) {
      return this.$i18n.locale === 'en' ? '/en' + path : path;
    },
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
        if (this.editForm.floorCount < 1 || this.editForm.floorCount > 30) {
          this.showToast('楼层数必须在1-30之间');
          return;
        }

        if (this.editForm.roomsPerFloor < 1 || this.editForm.roomsPerFloor > 100) {
          this.showToast('每层房间数必须在1-100之间');
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
    handleManageApplications(dorm) {
      this.currentDorm = dorm;
      this.showApplicationsModal = true;
      this.fetchApplications(dorm.dorm_id);
    },
    async fetchRooms(dormId) {
      try {
        const response = await fetch(`http://localhost:3000/api/dorm/rooms?dormId=${dormId}`);
        const data = await response.json();
        
        if (response.ok) {
          this.roomData = data.rooms || [];
        } else {
          console.error('获取房间信息失败:', data.message);
        }
      } catch (error) {
        console.error('获取房间错误:', error);
      }
    },
    async fetchApplications(dormId) {
      if (!dormId) return;
      
      try {
        this.loadingApplications = true;
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          this.$router.push('/login');
          return;
        }
        
        const response = await fetch(`http://localhost:3000/api/dorm/applications/${dormId}?userId=${userId}`);
        const data = await response.json();
        
        if (response.ok) {
          this.applications = data.data;
        } else {
          console.error('获取申请列表失败:', data.message);
          this.showToast(data.message || '获取申请列表失败');
        }
        
        // 同时获取宿舍房间信息
        await this.fetchRooms(dormId);
      } catch (error) {
        console.error('获取申请列表错误:', error);
        this.showToast('获取申请列表失败，请稍后重试');
      } finally {
        this.loadingApplications = false;
      }
    },
    async handleApplicationAction(applicationId, status) {
      try {
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          this.$router.push('/login');
          return;
        }
        
        const response = await fetch(`http://localhost:3000/api/dorm/application/${applicationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status,
            userId
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // 移除已处理的申请
          this.applications = this.applications.filter(app => app.application_id !== applicationId);
          this.showToast(status === 'approved' ? '已通过申请' : '已拒绝申请');
        } else {
          console.error('处理申请失败:', data.message);
          this.showToast(data.message || '处理申请失败');
        }
      } catch (error) {
        console.error('处理申请错误:', error);
        this.showToast('处理申请失败，请稍后重试');
      }
    },
    formatTags(tagsString) {
      if (!tagsString) return [];
      return tagsString.split(' ')
        .filter(tag => tag.trim() !== '')
        .map(tag => tag.startsWith('#') ? tag.substring(1) : tag);
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
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
    },
    async handleAssignRoommates() {
      try {
        // If already assigning, don't allow multiple executions
        if (this.isAssigning) {
          return;
        }
        
        if (this.applications.length === 0) {
          this.showToast('没有待处理的申请');
          return;
        }
        
        this.isAssigning = true;
        this.assignProgress = 0;
        this.assignProgressText = '正在初始化...';
        this.showToast('正在智能分配舍友...');
        
        // Start progress animation
        this.startProgressAnimation();
        
        const userId = localStorage.getItem('userId');
        const response = await fetch('http://localhost:3000/api/dorm/assign-roommates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dormId: this.currentDorm.dorm_id,
            userId: userId
          })
        });
        
        // Complete the progress
        this.assignProgress = 95;
        this.assignProgressText = '分配完成，正在更新数据...';
        
        const data = await response.json();
        
        if (response.ok) {
          // Complete the progress
          this.assignProgress = 100;
          this.assignProgressText = '分配成功!';
          
          // Short delay to show 100% completion
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Store assignment results
          this.roomAssignments = data.data.roomAssignments;
          this.showAssignmentResults = true;
          this.showToast('舍友分配成功！');
          // Refresh applications list
          this.fetchApplications(this.currentDorm.dorm_id);
        } else {
          this.showToast(data.message || '舍友分配失败，请重试');
        }
      } catch (error) {
        console.error('分配舍友错误:', error);
        this.showToast('舍友分配失败，请稍后重试');
      } finally {
        // Make sure to reset the state even if there's an error
        this.isAssigning = false;
      }
    },
    // Add this method to simulate progress during API call
    startProgressAnimation() {
      let progress = 0;
      const interval = setInterval(() => {
        if (this.isAssigning && progress < 90) {
          // Simulate progress up to 90%
          progress += Math.random() * 5;
          this.assignProgress = Math.min(90, progress);
          
          // Update progress text based on completion percentage
          if (this.assignProgress < 30) {
            this.assignProgressText = '正在分析用户性格标签...';
          } else if (this.assignProgress < 60) {
            this.assignProgressText = '正在计算最佳舍友组合...';
          } else if (this.assignProgress < 90) {
            this.assignProgressText = '正在分配用户到房间...';
          }
        } else {
          clearInterval(interval);
        }
      }, 300);
    },
    closeAssignmentResults() {
      this.showAssignmentResults = false;
    },
    getRoomNumber(roomId) {
      const room = this.roomData.find(r => r.room_id === Number(roomId));
      return room ? room.room_number : `房间 ${roomId}`;
    },
    getUsernameById(userId) {
      // 从申请列表中查找用户名
      const application = this.applications.find(app => app.user_id === Number(userId));
      return application ? application.username : `用户 ${userId}`;
    },
    getUserTagsById(userId) {
      // 从申请列表中查找用户标签
      const application = this.applications.find(app => app.user_id === Number(userId));
      return application ? application.user_tags : '无标签';
    },
    async handleViewRooms() {
      try {
        const dormId = this.currentDorm.dorm_id;
        if (!dormId) {
          this.showToast('请先选择宿舍');
          return;
        }
        
        this.showToast('正在获取房间信息...');
        
        const response = await fetch(`http://localhost:3000/api/dorm/room-occupants?dormId=${dormId}`);
        const data = await response.json();
        
        if (response.ok) {
          this.roomOccupants = data.roomOccupants || [];
          this.showRoomOccupants = true;
        } else {
          this.showToast(data.message || '获取房间信息失败');
        }
      } catch (error) {
        console.error('获取房间信息错误:', error);
        this.showToast('获取房间信息失败，请稍后重试');
      }
    },
    closeRoomOccupants() {
      this.showRoomOccupants = false;
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
  color: var(--text-3);
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
  background-color: var(--overlay);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--bg-2);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-solid);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background-color: var(--bg-2);
  z-index: 1;
}

.modal-header h3 {
  color: #4CAF50;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-3);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-1);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-solid);
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
  color: var(--text-2);
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--bg-3);
  border: 1px solid var(--border-solid);
  border-radius: 6px;
  color: var(--text-1);
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
  box-shadow: 0 4px 12px var(--shadow-sm);
}

/* 申请管理模态窗口样式 */
.applications-modal {
  max-width: 600px;
}

.loading-applications,
.empty-applications {
  text-align: center;
  padding: 2rem;
  color: var(--text-3);
}

.applications-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.top-actions {
  margin-bottom: 1.5rem;
  text-align: center;
}

.applications-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-solid);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.applications-count {
  font-size: 0.9rem;
  color: #aaa;
}

.applications-actions {
  display: flex;
  flex-direction: row;
  gap: 10px;
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.btn-icon {
  margin-right: 0.5rem;
}

.assign-roommates-btn, .view-rooms-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex: 0 0 auto;
  min-width: 120px;
  justify-content: center;
}

.assign-roommates-btn {
  background-color: #4CAF50;
}

.view-rooms-btn {
  background-color: #2196F3;
}

.assign-roommates-btn:hover, .view-rooms-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
}

.assign-roommates-btn:disabled {
  background-color: #7c7c7c;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.7;
}

.assign-roommates-btn.loading {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

.application-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem;
  background-color: var(--bg-1);
  border-radius: 10px;
  border: 1px solid #2a2a2a;
  transition: all 0.2s;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.application-item:hover {
  border-color: var(--border-solid);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.user-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 0.8rem;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.user-name {
  font-size: 0.9rem;
  color: var(--text-1);
}

.user-tags {
  font-size: 0.8rem;
  color: #aaa;
}

.application-time {
  color: var(--text-3);
  font-size: 0.8rem;
}

.application-actions {
  display: flex;
  gap: 0.5rem;
}

.reject-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  background-color: #dc3545;
  color: white;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.reject-btn:hover {
  background-color: #c82333;
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.reject-btn .icon {
  font-size: 0.9rem;
}

/* 分配结果模态窗口样式 */
.assignment-results {
  max-width: 600px;
}

.empty-assignment-results {
  text-align: center;
  padding: 2rem;
  color: var(--text-3);
}

.assignment-results-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.assignment-result-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--bg-1);
  border-radius: 10px;
  border: 1px solid #2a2a2a;
  margin-bottom: 1rem;
}

.result-icon {
  font-size: 2rem;
  color: #4CAF50;
  margin-right: 1rem;
}

.result-text {
  text-align: center;
}

.result-text h4 {
  margin: 0;
  color: var(--text-1);
  font-size: 1.5rem;
}

.result-text p {
  margin: 0;
  color: var(--text-3);
  font-size: 1rem;
}

.room-assignment-card {
  background-color: var(--bg-1);
  border-radius: 10px;
  border: 1px solid #2a2a2a;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.room-number {
  font-size: 1rem;
  color: var(--text-1);
}

.occupants-count {
  font-size: 0.9rem;
  color: #aaa;
}

.user-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: var(--bg-2);
  border-radius: 6px;
  border: 1px solid var(--border-solid);
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 0.8rem;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.user-name {
  font-size: 0.9rem;
  color: var(--text-1);
}

.user-tags {
  font-size: 0.8rem;
  color: #aaa;
}

/* 房间居住情况模态窗口样式 */
.room-occupants {
  max-width: 600px;
}

.loading-room-occupants,
.empty-room-occupants {
  text-align: center;
  padding: 2rem;
  color: var(--text-3);
}

.room-occupants-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.room-occupant-item {
  background-color: var(--bg-1);
  border-radius: 10px;
  border: 1px solid #2a2a2a;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.room-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.room-number {
  font-size: 1rem;
  color: var(--text-1);
}

.occupants-count {
  font-size: 0.9rem;
  color: #aaa;
}

.occupants-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.occupant-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: var(--bg-2);
  border-radius: 6px;
  border: 1px solid var(--border-solid);
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 0.8rem;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.user-name {
  font-size: 0.9rem;
  color: var(--text-1);
}

.user-tags {
  font-size: 0.8rem;
  color: #aaa;
}

.empty-occupants {
  padding: 1rem;
  color: var(--text-3);
  font-style: italic;
}

.instruction-box {
  background-color: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 8px;
  padding: 1.2rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.instruction-icon {
  font-size: 2rem;
  color: #2196F3;
}

.instruction-content h3 {
  margin: 0 0 0.5rem 0;
  color: #2196F3;
  font-size: 1.2rem;
}

.instruction-content p {
  margin: 0;
  color: #bbb;
  line-height: 1.5;
}

/* Add a loading progress overlay */
.progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--overlay);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.progress-container {
  background-color: var(--bg-2);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

.progress-bar-container {
  height: 20px;
  background-color: var(--bg-3);
  border-radius: 10px;
  margin-bottom: 1rem;
}

.progress-bar {
  height: 100%;
  background-color: #4CAF50;
  border-radius: 10px;
}

.progress-container h3 {
  color: #4CAF50;
  margin-bottom: 1rem;
}

.progress-container p {
  color: var(--text-1);
  text-align: center;
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