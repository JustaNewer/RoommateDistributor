<template>
  <div class="dorm-detail">
    <header class="detail-header">
      <button class="back-btn" @click="$router.back()">
        ← 返回
      </button>
      <h1>{{ dormData.dorm_name || '加载中...' }} - 入住情况</h1>
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
          </div>
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
                    :class="{ 'occupied': bed <= room.current_occupants }"
                    @mouseenter="bed <= room.current_occupants && fetchBedOccupant(room.room_id, bed - 1)"
                    @mouseleave="hideUserTooltip"
                  ></div>
                </div>
              </div>
            </div>
          </div>
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
        rooms_per_floor: 0
      },
      roomsByFloor: {},
      showTooltip: false,
      tooltipPosition: {
        top: '0px',
        left: '0px'
      },
      tooltipUser: {},
      loadingTooltip: false,
      roomOccupantsCache: {}  // 缓存房间用户信息
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
        const response = await fetch(`http://localhost:3000/api/dorm/room-status/${dormId}`);
        const data = await response.json();
        
        if (response.ok) {
          this.dormData = data.data.dorm_info;
          this.roomsByFloor = data.data.rooms_by_floor;
        } else {
          console.error('获取宿舍房间状态失败:', data.message);
          this.$notify({
            type: 'error',
            title: '获取失败',
            message: data.message || '获取房间状态失败'
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
    }
  },
  mounted() {
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
</style> 