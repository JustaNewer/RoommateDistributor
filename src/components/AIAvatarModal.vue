<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ $t('aiAvatar.title') }}</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label>{{ $t('aiAvatar.label') }}</label>
          <textarea
            v-model="prompt"
            :placeholder="$t('aiAvatar.placeholder')"
            rows="4"
          ></textarea>
          <div class="hint-text">{{ $t('aiAvatar.hint') }}</div>
        </div>
        <div class="examples">
          <p class="examples-title">{{ $t('aiAvatar.examplesTitle') }}</p>
          <div class="example-tags">
            <span class="example-tag" @click="prompt = $t('aiAvatar.animePrompt')">
              {{ $t('aiAvatar.anime') }}
            </span>
            <span class="example-tag" @click="prompt = $t('aiAvatar.businessPrompt')">
              {{ $t('aiAvatar.business') }}
            </span>
            <span class="example-tag" @click="prompt = $t('aiAvatar.cartoonPrompt')">
              {{ $t('aiAvatar.cartoon') }}
            </span>
          </div>
        </div>
        <button 
          class="generate-btn" 
          @click="handleGenerate"
          :disabled="isGenerating"
        >
          {{ isGenerating ? $t('aiAvatar.generating') : $t('aiAvatar.generateBtn') }}
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
        alert(this.$t('aiAvatar.inputRequired'));
        return;
      }

      this.isGenerating = true;
      try {
        const response = await fetch('http://localhost:3000/api/avatar/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: localStorage.getItem('userId'),
            prompt: this.prompt
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          alert(this.$t('aiAvatar.success'));
          this.$emit('avatarGenerated', data.data.avatarUrl);
          this.$emit('close');
        } else {
          alert(data.message || '生成失败');
        }
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
  background-color: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--bg-2);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 16px var(--shadow);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-solid);
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
  color: var(--text-3);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--text-1);
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
  color: var(--text-1);
}

textarea {
  width: 100%;
  padding: 0.8rem;
  background-color: var(--bg-3);
  border: 1px solid var(--border-solid);
  border-radius: 8px;
  color: var(--text-1);
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.2s;
}

textarea:focus {
  outline: none;
  border-color: #4CAF50;
}

textarea::placeholder {
  color: var(--text-4);
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

.hint-text {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-3);
  line-height: 1.5;
}

.examples {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--bg-1);
  border-radius: 8px;
}

.examples-title {
  color: #aaa;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.example-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.example-tag {
  padding: 0.4rem 0.8rem;
  background-color: var(--bg-3);
  color: #4CAF50;
  border-radius: 16px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-solid);
}

.example-tag:hover {
  background-color: #4CAF50;
  color: white;
  transform: translateY(-1px);
}
</style> 