<template>
  <div class="dorm-detail">
    <header class="detail-header">
      <button class="back-btn" @click="$router.back()">
        ← 返回
      </button>
      <h1>{{ dormData.dorm_name || '加载中...' }} - 入住情况</h1>
      
      <!-- 添加垃圾桶图标 -->
      <div 
        class="trash-icon" 
        :class="{ 'drag-over': isTrashTarget }"
        @mouseup="handleTrashDrop"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path fill="none" d="M0 0h24v24H0z"/>
          <path d="M7 4V2h10v2h5v2h-2v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6H2V4h5zM6 6v14h12V6H6zm3 3h2v8H9V9zm4 0h2v8h-2V9z" fill="currentColor"/>
        </svg>
      </div>
    </header>

    <main class="detail-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <template v-else>
        <div class="dorm-info">
          <div class="info-item">
            <span class="label">学校：</span>
            <span class="value">{{ dormData.school_name }}</span>
          </div>
          <div class="info-item">
            <span class="label">容量：</span>
            <span class="value">{{ dormData.space }}人间</span>
          </div>
          <div class="info-item">
            <span class="label">楼层：</span>
            <span class="value">{{ dormData.floor_count }}层</span>
          </div>
          <div class="info-item">
            <span class="label">每层房间：</span>
            <span class="value">{{ dormData.rooms_per_floor }}间</span>
          </div>
          <div class="info-item occupancy-legend">
            <span class="legend-item">
              <span class="bed-icon empty"></span>
              <span>空床位</span>
            </span>
            <span class="legend-item">
              <span class="bed-icon occupied"></span>
              <span>已入住</span>
            </span>
            <span v-if="isDragging" class="legend-item">
              <span class="bed-icon dragging"></span>
              <span>拖动中</span>
            </span>
          </div>
        </div>

        <div class="auth-message" v-if="!isLoggedIn">
          请先登录后才能操作床位分配
        </div>
        <div class="auth-message" v-else-if="!isCreator">
          只有宿舍创建人才能操作床位分配
        </div>

        <div class="floors-container">
          <div v-for="(rooms, floor) in roomsByFloor" :key="floor" class="floor">
            <h3 class="floor-title">{{ floor }}层</h3>
            <div class="rooms-container">
              <div v-for="room in rooms" :key="room.room_id" class="room" :class="{'full': room.current_occupants === room.capacity}">
                <div class="room-header">
                  <div class="room-number">{{ room.room_number }}</div>
                  <div class="occupancy-status">{{ room.current_occupants }}/{{ room.capacity }}</div>
                </div>
                <div class="beds-container">
                  <div 
                    v-for="bed in room.capacity" 
                    :key="bed" 
                    class="bed"
                    :class="{
                      'occupied': bed <= room.current_occupants,
                      'dragging': isDragging && draggedBed && draggedBed.roomId === room.room_id && draggedBed.bedIndex === bed - 1,
                      'drag-over': isDropTarget && dropTargetInfo.roomId === room.room_id && dropTargetInfo.bedIndex === bed - 1
                    }"
                    @mouseenter="bed <= room.current_occupants && fetchBedOccupant(room.room_id, bed - 1)"
                    @mouseleave="hideUserTooltip"
                    @mousedown="startDrag($event, room.room_id, bed - 1, bed <= room.current_occupants)"
                    @mouseup="handleDrop(room.room_id, bed - 1, bed <= room.current_occupants)"
                    @dragover.prevent
                    @dragstart.prevent
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="status-message" v-if="statusMessage">
          {{ statusMessage }}
        </div>
      </template>
    </main>

    <!-- User tooltip -->
    <div class="user-tooltip" v-if="showTooltip" :style="tooltipPosition">
      <div v-if="loadingTooltip" class="tooltip-loading">加载中...</div>
      <div v-else class="tooltip-content">
        <div class="tooltip-avatar">
          <img v-if="tooltipUser.avatar_url" :src="tooltipUser.avatar_url" alt="Avatar">
          <div v-else class="default-avatar">{{ tooltipUser.username ? tooltipUser.username.charAt(0).toUpperCase() : 'U' }}</div>
        </div>
        <div class="tooltip-info">
          <div class="tooltip-username">{{ tooltipUser.username || '未知用户' }}</div>
        </div>
      </div>
    </div>

    <!-- 床位移动的虚拟元素 -->
    <div class="dragged-bed" v-if="isDragging" :style="draggedPosition"></div>

    <!-- 删除确认对话框 -->
    <div class="confirm-dialog-overlay" v-if="showDeleteConfirm" @click="cancelDelete">
      <div class="confirm-dialog" @click.stop>
        <div class="confirm-dialog-header">
          <h3>删除住户确认</h3>
        </div>
        <div class="confirm-dialog-content">
          <p>您确定要删除该住户吗？</p>
          <p class="confirm-dialog-user" v-if="deleteUserInfo">
            <span class="user-avatar">
              <img v-if="deleteUserInfo.avatar_url" :src="deleteUserInfo.avatar_url" alt="Avatar">
              <div v-else class="default-avatar">{{ deleteUserInfo.username ? deleteUserInfo.username.charAt(0).toUpperCase() : 'U' }}</div>
            </span>
            <span class="user-name">{{ deleteUserInfo.username || '未知用户' }}</span>
          </p>
          <p class="confirm-dialog-warning">此操作将从宿舍中移除该用户，且不可撤销！</p>
        </div>
        <div class="confirm-dialog-actions">
          <button class="cancel-btn" @click="cancelDelete">取消</button>
          <button class="confirm-btn" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DormDetail',
  data() {
    return {
      loading: true,
      dormData: {
        dorm_id: null,
        dorm_name: '',
        school_name: '',
        space: 0,
        floor_count: 0,
        rooms_per_floor: 0,
        creator_user_id: null
      },
      roomsByFloor: {},
      showTooltip: false,
      tooltipPosition: {
        top: '0px',
        left: '0px'
      },
      tooltipUser: {},
      loadingTooltip: false,
      roomOccupantsCache: {},  // 缓存房间用户信息
      
      // 拖拽相关
      isDragging: false,
      draggedBed: null,
      draggedPosition: {
        top: '0px',
        left: '0px'
      },
      dragStartX: 0,
      dragStartY: 0,
      longPressTimer: null,
      isDropTarget: false,
      dropTargetInfo: {
        roomId: null,
        bedIndex: null
      },
      statusMessage: '',
      isProcessing: false,
      isLoggedIn: false,
      authToken: null,
      currentUserId: null,
      isCreator: false,
      isTrashTarget: false,
      
      // 删除确认相关
      showDeleteConfirm: false,
      pendingDeleteUserId: null,
      pendingDeleteRoomId: null,
      deleteUserInfo: null
    }
  },
  computed: {
    reversedFloors() {
      return Object.keys(this.roomsByFloor)
        .map(Number)
        .sort((a, b) => b - a); // 降序，顶楼在上
    }
  },
  methods: {
    async fetchRoomStatus() {
      try {
        const dormId = this.$route.params.id;
        console.log('开始获取宿舍详情, ID:', dormId);
        
        const response = await fetch(`http://localhost:3000/api/dorm/${dormId}`);
        const data = await response.json();
        
        if (response.ok) {
          console.log('获取到宿舍详情:', data.data);
          this.dormData = data.data;
          
          // 确保creator_user_id是数字类型
          if (data.data.creator_user_id) {
            this.dormData.creator_user_id = Number(data.data.creator_user_id);
          }
          
          console.log('宿舍创建者ID:', this.dormData.creator_user_id);
          
          // 重新检查创建者状态
          this.checkCreatorStatus();
          
          // 获取房间状态
          console.log('开始获取房间状态');
          const roomStatusResponse = await fetch(`http://localhost:3000/api/dorm/room-status/${dormId}`);
          const roomStatusData = await roomStatusResponse.json();
          
          if (roomStatusResponse.ok) {
            this.roomsByFloor = roomStatusData.data.rooms_by_floor;
            console.log('获取到房间状态');
          } else {
            console.error('获取宿舍房间状态失败:', roomStatusData.message);
            this.$notify({
              type: 'error',
              title: '获取失败',
              message: roomStatusData.message || '获取房间状态失败'
            });
          }
        } else {
          console.error('获取宿舍详情失败:', data.message);
          this.$notify({
            type: 'error',
            title: '获取失败',
            message: data.message || '获取宿舍详情失败'
          });
        }
      } catch (error) {
        console.error('获取宿舍房间状态错误:', error);
        this.$notify({
          type: 'error',
          title: '系统错误',
          message: '网络错误，请稍后重试'
        });
      } finally {
        this.loading = false;
      }
    },
    async loadData() {
      this.loading = true;
      await this.fetchRoomStatus();
    },
    async fetchBedOccupant(roomId, bedIndex) {
      try {
        this.loadingTooltip = true;
        this.tooltipUser = {};
        
        // 计算tooltip位置（基于鼠标事件）
        this.tooltipPosition = {
          top: `${event.clientY + 10}px`,
          left: `${event.clientX + 10}px`
        };
        this.showTooltip = true;
        
        // 如果缓存中已有该房间数据，直接使用
        if (this.roomOccupantsCache[roomId]) {
          const occupantsData = this.roomOccupantsCache[roomId];
          // 获取对应床位的用户（如果存在）
          if (occupantsData.occupants && occupantsData.occupants[bedIndex]) {
            this.tooltipUser = occupantsData.occupants[bedIndex];
          }
          this.loadingTooltip = false;
          return;
        }
        
        // 否则从服务器获取
        const response = await fetch(`http://localhost:3000/api/dorm/room-occupants/${roomId}`);
        const data = await response.json();
        
        if (response.ok) {
          // 缓存房间用户数据
          this.roomOccupantsCache[roomId] = data.data;
          
          // 获取对应床位的用户（如果存在）
          if (data.data.occupants && data.data.occupants[bedIndex]) {
            this.tooltipUser = data.data.occupants[bedIndex];
          }
        } else {
          console.error('获取用户信息失败:', data.message);
        }
      } catch (error) {
        console.error('获取用户信息错误:', error);
      } finally {
        this.loadingTooltip = false;
      }
    },
    hideUserTooltip() {
      this.showTooltip = false;
    },
    
    // 拖拽相关方法
    startDrag(event, roomId, bedIndex, isOccupied) {
      console.log('尝试开始拖拽操作');
      console.log('登录状态:', this.isLoggedIn, '创建者状态:', this.isCreator);
      console.log('当前用户ID:', this.currentUserId, '宿舍创建者ID:', this.dormData.creator_user_id);
      
      if (!this.isLoggedIn) {
        this.statusMessage = '请先登录后才能操作床位分配';
        setTimeout(() => {
          this.statusMessage = '';
        }, 3000);
        return;
      }
      
      if (!this.isCreator) {
        this.statusMessage = '只有宿舍创建人才能操作床位分配';
        setTimeout(() => {
          this.statusMessage = '';
        }, 3000);
        return;
      }
      
      if (this.isProcessing) {
        return;
      }

      if (!isOccupied) {
        return; // 只能拖动已占用的床位
      }

      // 长按开始拖动
      this.longPressTimer = setTimeout(() => {
        this.startActualDrag(event, roomId, bedIndex);
      }, 500); // 长按500ms开始拖动

      // 记录开始位置
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;

      // 添加移动和取消事件监听器
      window.addEventListener('mousemove', this.trackDragStart);
      window.addEventListener('mouseup', this.cancelDragStart);
    },

    trackDragStart(event) {
      // 如果在长按触发前移动了太多，则取消长按
      if (
        Math.abs(event.clientX - this.dragStartX) > 5 ||
        Math.abs(event.clientY - this.dragStartY) > 5
      ) {
        this.cancelDragStart();
      }
    },

    cancelDragStart() {
      clearTimeout(this.longPressTimer);
      window.removeEventListener('mousemove', this.trackDragStart);
      window.removeEventListener('mouseup', this.cancelDragStart);
    },

    startActualDrag(event, roomId, bedIndex) {
      window.removeEventListener('mousemove', this.trackDragStart);
      window.removeEventListener('mouseup', this.cancelDragStart);
      
      // 确保有用户信息
      if (!this.roomOccupantsCache[roomId] || !this.roomOccupantsCache[roomId].occupants[bedIndex]) {
        this.fetchBedOccupant(roomId, bedIndex).then(() => {
          this.initiateDrag(roomId, bedIndex, event);
        });
      } else {
        this.initiateDrag(roomId, bedIndex, event);
      }
    },
    
    initiateDrag(roomId, bedIndex, event) {
      this.isDragging = true;
      this.draggedBed = {
        roomId,
        bedIndex,
        userId: this.roomOccupantsCache[roomId].occupants[bedIndex].user_id
      };
      
      // 设置拖动元素的位置
      this.draggedPosition = {
        top: `${event.clientY - 20}px`,
        left: `${event.clientX - 20}px`
      };
      
      // 添加移动和结束监听器
      window.addEventListener('mousemove', this.handleDragMove);
      window.addEventListener('mouseup', this.endDrag);
      
      this.hideUserTooltip();
    },
    
    handleDragMove(event) {
      if (!this.isDragging) return;
      
      // 更新拖动元素位置
      this.draggedPosition = {
        top: `${event.clientY - 20}px`,
        left: `${event.clientX - 20}px`
      };
      
      // 检测是否在垃圾桶区域上
      const trashIcon = document.querySelector('.trash-icon');
      if (trashIcon) {
        const trashRect = trashIcon.getBoundingClientRect();
        
        if (
          event.clientX >= trashRect.left && 
          event.clientX <= trashRect.right && 
          event.clientY >= trashRect.top && 
          event.clientY <= trashRect.bottom
        ) {
          this.isTrashTarget = true;
          this.statusMessage = '释放以删除此住户';
        } else {
          this.isTrashTarget = false;
          this.statusMessage = '拖动到目标床位释放';
        }
      }
    },
    
    handleDrop(roomId, bedIndex, isOccupied) {
      if (!this.isDragging) return;
      
      this.isDropTarget = true;
      this.dropTargetInfo = { roomId, bedIndex };
      
      // 如果是同一个房间，则不允许交换
      if (this.draggedBed.roomId === roomId) {
        this.statusMessage = '同一房间内不能交换床位';
        setTimeout(() => {
          this.statusMessage = '';
          this.isDropTarget = false;
          this.dropTargetInfo = { roomId: null, bedIndex: null };
        }, 2000);
        return;
      }
      
      // 根据目标位置是否已占用，执行不同操作
      if (isOccupied) {
        // 交换两个床位
        this.swapBeds(
          this.draggedBed.userId,
          this.draggedBed.roomId, 
          this.roomOccupantsCache[roomId].occupants[bedIndex].user_id,
          roomId
        );
      } else {
        // 移动到空床位
        this.reassignBed(
          this.draggedBed.userId,
          this.draggedBed.roomId,
          roomId
        );
      }
    },
    
    endDrag() {
      window.removeEventListener('mousemove', this.handleDragMove);
      window.removeEventListener('mouseup', this.endDrag);
      
      setTimeout(() => {
        this.isDragging = false;
        this.draggedBed = null;
        this.isDropTarget = false;
        this.isTrashTarget = false;
        this.dropTargetInfo = { roomId: null, bedIndex: null };
        
        if (!this.statusMessage.includes('成功') && !this.statusMessage.includes('失败') && 
            !this.statusMessage.includes('移除')) {
          this.statusMessage = '';
        }
      }, 300);
    },
    
    async reassignBed(userId, currentRoomId, newRoomId) {
      if (currentRoomId === newRoomId) {
        this.statusMessage = '相同房间，无需调整';
        return;
      }
      
      this.isProcessing = true;
      this.statusMessage = '正在调整床位...';
      
      try {
        const response = await fetch('http://localhost:3000/api/dorm/reassign-bed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            userId,
            roomId: currentRoomId,
            newRoomId
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          this.statusMessage = '床位调整成功';
          // 重新加载数据
          this.refreshData();
        } else {
          this.statusMessage = `操作失败: ${data.message}`;
          console.error('床位调整失败:', data);
        }
      } catch (error) {
        this.statusMessage = '网络错误，请重试';
        console.error('床位调整错误:', error);
      } finally {
        this.isProcessing = false;
        // 3秒后清除状态消息
        setTimeout(() => {
          if (this.statusMessage) {
            this.statusMessage = '';
          }
        }, 3000);
      }
    },
    
    async swapBeds(userId1, roomId1, userId2, roomId2) {
      if (userId1 === userId2) {
        this.statusMessage = '相同用户，无需交换';
        return;
      }
      
      // 检查是否在同一房间
      if (roomId1 === roomId2) {
        this.statusMessage = '同一房间内不能交换床位';
        setTimeout(() => {
          this.statusMessage = '';
        }, 3000);
        return;
      }
      
      this.isProcessing = true;
      this.statusMessage = '正在交换床位...';
      
      try {
        const response = await fetch('http://localhost:3000/api/dorm/swap-beds', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            userId1,
            roomId1,
            userId2,
            roomId2
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          this.statusMessage = '床位交换成功';
          // 重新加载数据
          this.refreshData();
        } else {
          this.statusMessage = `操作失败: ${data.message}`;
          console.error('床位交换失败:', data);
        }
      } catch (error) {
        this.statusMessage = '网络错误，请重试';
        console.error('床位交换错误:', error);
      } finally {
        this.isProcessing = false;
        // 3秒后清除状态消息
        setTimeout(() => {
          if (this.statusMessage) {
            this.statusMessage = '';
          }
        }, 3000);
      }
    },
    
    async refreshData() {
      // 清除缓存并重新加载数据
      this.roomOccupantsCache = {};
      await this.fetchRoomStatus();
    },
    
    // 检查登录状态
    checkAuthStatus() {
      const token = localStorage.getItem('userToken');
      const userId = localStorage.getItem('userId');
      
      console.log('检查认证状态 - localStorage中的Token:', token ? '存在' : '不存在');
      console.log('检查认证状态 - localStorage中的UserId:', userId);
      
      if (token && userId) {
        this.isLoggedIn = true;
        this.authToken = token;
        this.currentUserId = Number(userId);
        console.log('认证状态：已登录，用户ID:', this.currentUserId);
        this.verifyToken();
      } else {
        this.isLoggedIn = false;
        this.currentUserId = null;
        console.log('认证状态：未登录');
      }
    },
    
    // 验证令牌是否有效
    async verifyToken() {
      try {
        console.log('开始验证令牌...');
        const response = await fetch('http://localhost:3000/api/auth/verify-token', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('令牌验证成功，用户数据:', data.user);
          this.currentUserId = Number(data.user.id);
          this.isLoggedIn = true;
          
          // 如果已经加载了宿舍数据，检查创建者状态
          if (this.dormData.creator_user_id) {
            this.checkCreatorStatus();
          }
        } else {
          console.log('令牌验证失败');
          this.isLoggedIn = false;
          this.currentUserId = null;
          localStorage.removeItem('userToken');
          localStorage.removeItem('userId');
        }
      } catch (error) {
        console.error('验证令牌错误:', error);
        this.isLoggedIn = false;
      }
    },
    
    // 检查当前用户是否为宿舍创建人
    checkCreatorStatus() {
      if (this.currentUserId && this.dormData.creator_user_id) {
        console.log('当前用户ID:', this.currentUserId, '类型:', typeof this.currentUserId);
        console.log('宿舍创建者ID:', this.dormData.creator_user_id, '类型:', typeof this.dormData.creator_user_id);
        
        // 确保两个ID都是数字类型进行比较
        const userId = Number(this.currentUserId);
        const creatorId = Number(this.dormData.creator_user_id);
        
        this.isCreator = userId === creatorId;
        console.log('是否为创建者:', this.isCreator);
      } else {
        console.log('用户ID或创建者ID缺失:', this.currentUserId, this.dormData.creator_user_id);
        this.isCreator = false;
      }
    },
    
    // 处理拖动到垃圾桶
    handleTrashDrop() {
      if (!this.isDragging || !this.draggedBed) return;
      
      if (!this.isLoggedIn) {
        this.statusMessage = '请先登录后才能操作床位分配';
        setTimeout(() => {
          this.statusMessage = '';
        }, 3000);
        return;
      }
      
      if (!this.isCreator) {
        this.statusMessage = '只有宿舍创建人才能操作床位分配';
        setTimeout(() => {
          this.statusMessage = '';
        }, 3000);
        return;
      }
      
      this.isTrashTarget = true;
      
      // 获取要删除的用户信息
      const userId = this.draggedBed.userId;
      const roomId = this.draggedBed.roomId;
      const bedIndex = this.draggedBed.bedIndex;
      
      // 保存待删除用户的信息
      this.pendingDeleteUserId = userId;
      this.pendingDeleteRoomId = roomId;
      this.deleteUserInfo = this.roomOccupantsCache[roomId].occupants[bedIndex];
      
      // 显示确认对话框
      this.showDeleteConfirm = true;
      
      // 重置垃圾桶高亮状态
      setTimeout(() => {
        this.isTrashTarget = false;
      }, 500);
    },
    
    // 确认删除
    confirmDelete() {
      if (this.pendingDeleteUserId && this.pendingDeleteRoomId) {
        this.removeOccupant(this.pendingDeleteUserId, this.pendingDeleteRoomId);
        this.closeDeleteConfirm();
      }
    },
    
    // 取消删除
    cancelDelete() {
      this.closeDeleteConfirm();
    },
    
    // 关闭删除确认对话框
    closeDeleteConfirm() {
      this.showDeleteConfirm = false;
      this.pendingDeleteUserId = null;
      this.pendingDeleteRoomId = null;
      this.deleteUserInfo = null;
    },
    
    // 移除用户住户
    async removeOccupant(userId, roomId) {
      this.isProcessing = true;
      this.statusMessage = '正在移除住户...';
      
      try {
        const response = await fetch('http://localhost:3000/api/dorm/remove-occupant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            userId,
            roomId
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          this.statusMessage = '住户已移除';
          // 重新加载数据
          this.refreshData();
        } else {
          this.statusMessage = `操作失败: ${data.message}`;
          console.error('移除住户失败:', data);
        }
      } catch (error) {
        this.statusMessage = '网络错误，请重试';
        console.error('移除住户错误:', error);
      } finally {
        this.isProcessing = false;
        // 3秒后清除状态消息
        setTimeout(() => {
          if (this.statusMessage) {
            this.statusMessage = '';
          }
        }, 3000);
      }
    }
  },
  mounted() {
    console.log('组件挂载 - 开始初始化');
    // 先检查登录状态
    this.checkAuthStatus();
    // 然后加载数据
    this.loadData();
  }
}
</script>

<style scoped>
.dorm-detail {
  min-height: 100vh;
  background-color: #1a1a1a;
  color: #ffffff;
  padding-bottom: 2rem;
}

.detail-header {
  background-color: #2a2a2a;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  margin-bottom: 2rem;
  position: relative;
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

.detail-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
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

.dorm-info {
  background-color: #2a2a2a;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.occupancy-legend {
  flex-direction: row;
  justify-content: flex-start;
  gap: 1.5rem;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #aaa;
}

.bed-icon {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.bed-icon.empty {
  background-color: #333;
  border: 1px solid #444;
}

.bed-icon.occupied {
  background-color: #4CAF50;
  border: 1px solid #45a049;
}

.bed-icon.dragging {
  background-color: #FFC107;
  border: 1px solid #FFA000;
}

.label {
  color: #888;
  font-size: 0.9rem;
}

.value {
  color: #4CAF50;
  font-size: 1.1rem;
}

.floors-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.floor {
  background-color: #2a2a2a;
  border-radius: 12px;
  padding: 1.5rem;
}

.floor-title {
  color: #4CAF50;
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
  border-bottom: 1px solid #3a3a3a;
  padding-bottom: 0.5rem;
}

.rooms-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1.5rem;
}

.room {
  background-color: #1a1a1a;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #3a3a3a;
  transition: all 0.3s ease;
}

.room:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.room.full {
  border-color: #4CAF50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.room-number {
  color: #888;
  font-size: 1rem;
  font-weight: bold;
}

.occupancy-status {
  color: #4CAF50;
  font-size: 0.9rem;
  background-color: rgba(76, 175, 80, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
}

.beds-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.bed {
  aspect-ratio: 1;
  background-color: #333;
  border-radius: 4px;
  transition: all 0.3s ease;
  border: 1px solid #444;
}

.bed.occupied {
  background-color: #4CAF50;
  border-color: #45a049;
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
  cursor: pointer;
}

.bed.occupied:hover {
  transform: scale(1.05);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.8);
}

.bed.dragging {
  background-color: #FFC107;
  border-color: #FFA000;
  opacity: 0.5;
}

.bed.drag-over {
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(255, 193, 7, 0.8);
  border-color: #FFC107;
}

.user-tooltip {
  position: fixed;
  z-index: 1000;
  max-width: 200px;
  min-width: 120px;
  background: rgba(42, 42, 42, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 0.8rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none;
  transition: all 0.2s ease;
  transform: translateY(5px);
  opacity: 0.95;
  animation: tooltip-fade-in 0.2s forwards;
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 0.95;
    transform: translateY(0);
  }
}

.tooltip-loading {
  font-size: 0.8rem;
  color: #aaa;
  text-align: center;
}

.tooltip-content {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.tooltip-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #1a1a1a;
  border: 1px solid #4CAF50;
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
}

.tooltip-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-avatar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #4CAF50;
  color: #fff;
  font-weight: bold;
}

.tooltip-info {
  flex: 1;
}

.tooltip-username {
  font-size: 0.9rem;
  color: #fff;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dragged-bed {
  position: fixed;
  width: 40px;
  height: 40px;
  background-color: #FFC107;
  border-radius: 4px;
  border: 1px solid #FFA000;
  box-shadow: 0 0 10px rgba(255, 193, 7, 0.8);
  pointer-events: none;
  z-index: 2000;
  transition: transform 0.1s ease;
  transform: scale(1.2);
}

.status-message {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(42, 42, 42, 0.9);
  padding: 10px 20px;
  border-radius: 8px;
  color: #fff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: fade-in 0.3s ease;
}

.auth-message {
  text-align: center;
  color: #FFC107;
  background-color: rgba(255, 193, 7, 0.1);
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 2rem;
}

@keyframes fade-in {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.trash-icon {
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
  cursor: pointer;
  transition: all 0.3s ease;
}

.trash-icon:hover {
  background-color: rgba(244, 67, 54, 0.2);
  transform: translateY(-50%) scale(1.1);
}

.trash-icon.drag-over {
  background-color: rgba(244, 67, 54, 0.4);
  transform: translateY(-50%) scale(1.2);
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
}

.trash-icon svg {
  width: 24px;
  height: 24px;
}

@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
  }
  
  .detail-content {
    padding: 0 1rem;
  }
  
  .rooms-container {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
  }
  
  .dorm-info {
    grid-template-columns: 1fr;
  }
}

/* 确认对话框样式 */
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  animation: overlay-fade-in 0.3s ease;
}

.confirm-dialog {
  width: 90%;
  max-width: 400px;
  background: #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  animation: dialog-slide-in 0.3s ease;
}

.confirm-dialog-header {
  background: #1a1a1a;
  padding: 1rem;
  border-bottom: 1px solid #3a3a3a;
}

.confirm-dialog-header h3 {
  margin: 0;
  color: #f44336;
  font-size: 1.2rem;
}

.confirm-dialog-content {
  padding: 1.5rem;
}

.confirm-dialog-content p {
  margin: 0 0 1rem;
  color: #ddd;
  font-size: 1rem;
}

.confirm-dialog-user {
  display: flex;
  align-items: center;
  background: rgba(26, 26, 26, 0.5);
  padding: 0.8rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 0.8rem;
  border: 1px solid #4CAF50;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar .default-avatar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4CAF50;
  color: white;
  font-weight: bold;
}

.user-name {
  font-weight: bold;
  color: white;
}

.confirm-dialog-warning {
  color: #f44336 !important;
  font-size: 0.9rem !important;
  font-style: italic;
}

.confirm-dialog-actions {
  display: flex;
  padding: 1rem;
  background: #222;
  border-top: 1px solid #3a3a3a;
}

.confirm-dialog-actions button {
  flex: 1;
  padding: 0.8rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-dialog-actions button:hover {
  transform: translateY(-2px);
}

.cancel-btn {
  background: #333;
  color: #ddd;
  margin-right: 0.8rem;
}

.confirm-btn {
  background: #f44336;
  color: white;
}

@keyframes overlay-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes dialog-slide-in {
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style> 