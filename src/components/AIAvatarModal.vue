<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>AI 生成头像</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label>描述你想要的头像风格</label>
          <textarea
            v-model="prompt"
            placeholder="例如：一个微笑的动漫风格头像，蓝色头发，戴着眼镜..."
            rows="4"
          ></textarea>
        </div>
        <button 
          class="generate-btn" 
          @click="handleGenerate"
          :disabled="isGenerating"
        >
          {{ isGenerating ? '生成中...' : '开始生成' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AIAvatarModal',
  data() {
    return {
      prompt: '',
      isGenerating: false
    }
  },
  methods: {
    async handleGenerate() {
      if (!this.prompt.trim()) {
        alert('请输入头像描述');
        return;
      }

      this.isGenerating = true;
      try {
        // TODO: 调用后端 AI 生成接口
        // const response = await fetch('http://localhost:3000/api/avatar/generate', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({
        //     userId: localStorage.getItem('userId'),
        //     prompt: this.prompt
        //   })
        // });

        // const data = await response.json();
        // if (response.ok) {
        //   this.$emit('avatarGenerated', data.avatarUrl);
        //   this.$emit('close');
        // } else {
        //   alert(data.message || '生成失败');
        // }
      } catch (error) {
        console.error('生成头像错误:', error);
        alert('网络错误，请稍后重试');
      } finally {
        this.isGenerating = false;
      }
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: #2a2a2a;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #3a3a3a;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 1.5rem;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #fff;
}

textarea {
  width: 100%;
  padding: 0.8rem;
  background-color: #3a3a3a;
  border: 1px solid #4a4a4a;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.2s;
}

textarea:focus {
  outline: none;
  border-color: #4CAF50;
}

textarea::placeholder {
  color: #666;
}

.generate-btn {
  width: 100%;
  padding: 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn:hover:not(:disabled) {
  background-color: #45a049;
  transform: translateY(-1px);
}

.generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style> 