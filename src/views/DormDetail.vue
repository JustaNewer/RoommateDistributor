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
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
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
      roomsByFloor: {}
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