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
        加载中...
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
        </div>

        <div class="floors-container">
          <div v-for="floor in reversedFloors" :key="floor" class="floor">
            <h3 class="floor-title">{{ floor }}层</h3>
            <div class="rooms-container">
              <div v-for="room in dormData.rooms_per_floor" :key="room" class="room">
                <div class="room-number">{{ formatRoomNumber(floor, room) }}</div>
                <div class="beds-container">
                  <div 
                    v-for="bed in dormData.space" 
                    :key="bed" 
                    class="bed"
                    :class="{ 'occupied': isOccupied(floor, room, bed) }"
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
      occupancyData: {}
    }
  },
  computed: {
    reversedFloors() {
      return Array.from(
        { length: this.dormData.floor_count }, 
        (_, i) => this.dormData.floor_count - i
      );
    }
  },
  methods: {
    formatRoomNumber(floor, room) {
      return `${floor}${String(room).padStart(2, '0')}`;
    },
    isOccupied(floor, room, bed) {
      const roomKey = `${floor}-${room}`;
      return this.occupancyData[roomKey]?.includes(bed) || false;
    },
    async fetchDormData() {
      try {
        const dormId = this.$route.params.id;
        const response = await fetch(`http://localhost:3000/api/dorm/${dormId}`);
        const data = await response.json();
        
        if (response.ok) {
          this.dormData = data.data;
        } else {
          console.error('获取宿舍信息失败:', data.message);
        }
      } catch (error) {
        console.error('获取宿舍信息错误:', error);
      }
    },
    async fetchOccupancyData() {
      try {
        const dormId = this.$route.params.id;
        const response = await fetch(`http://localhost:3000/api/dorm/occupancy/${dormId}`);
        const data = await response.json();
        
        if (response.ok) {
          this.occupancyData = data.data.occupancy || {};
        } else {
          console.error('获取入住数据失败:', data.message);
        }
      } catch (error) {
        console.error('获取入住数据错误:', error);
      }
    },
    async loadAllData() {
      this.loading = true;
      await Promise.all([
        this.fetchDormData(),
        this.fetchOccupancyData()
      ]);
      this.loading = false;
    }
  },
  mounted() {
    this.loadAllData();
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
  text-align: center;
  padding: 2rem;
  color: #888;
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
}

.room-number {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 0.8rem;
  text-align: center;
}

.beds-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  padding: 0.5rem;
}

.bed {
  aspect-ratio: 1;
  background-color: #000000;
  border-radius: 4px;
  transition: all 0.3s ease;
  border: 1px solid #2a2a2a;
}

.bed.occupied {
  background-color: #4CAF50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
}
</style> 