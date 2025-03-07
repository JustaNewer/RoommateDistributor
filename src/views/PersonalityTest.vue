<template>
  <div class="chat-container">
    <header class="chat-header">
      <button class="back-btn" @click="$router.push('/profile')">
        ← 返回个人资料
      </button>
      <h1>性格测试</h1>
    </header>

    <main class="chat-content" ref="chatContent">
      <div class="messages" ref="messages">
        <div v-for="(message, index) in messages" :key="index" 
          :class="['message', message.type === 'user' ? 'user-message' : 'bot-message']">
          <div class="message-avatar">
            <img :src="message.type === 'user' ? userAvatar : botAvatar" :alt="message.type === 'user' ? '用户头像' : '智能体头像'">
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(message.content)"></div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>
      </div>

      <div v-if="showOptions && currentOptions.length > 0" class="options-container">
        <button 
          v-for="option in currentOptions" 
          :key="option"
          class="option-btn"
          @click="handleOptionSelect(option)"
        >
          {{ option }}
        </button>
      </div>

      <div v-if="!testCompleted" class="input-container">
        <input 
          type="text" 
          v-model="userInput"
          @keyup.enter="sendMessage(userInput)"
          placeholder="输入你的回答..."
          :disabled="isWaitingForBot || showOptions"
        >
        <button 
          class="send-btn" 
          @click="sendMessage(userInput)"
          :disabled="isWaitingForBot || !userInput.trim() || showOptions"
        >
          发送
        </button>
      </div>
    </main>

    <button 
      class="back-to-top" 
      @click="scrollToTop" 
      v-show="showBackToTop"
    >
      ↑ 回到顶部
    </button>
  </div>
</template>

<script>
export default {
  name: 'PersonalityTest',
  data() {
    return {
      messages: [],
      userInput: '',
      isWaitingForBot: false,
      testCompleted: false,
      showOptions: false,
      currentOptions: [],
      userAvatar: null,
      botAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=personality-test',
      chatId: null,
      extractedTags: [],
      showBackToTop: false
    }
  },
  methods: {
    formatMessage(text) {
      // 检查是否是问卷结束消息
      if (text.includes('问卷就到这里')) {
        // 使用更精确的正则表达式来提取标签
        const tags = text.match(/#([^#\s,.!?，。！？]+)/g)?.map(tag => tag.slice(1)) || [];
        
        if (tags.length > 0) {
          // 保存标签
          this.saveTags(tags);
        }
      }
      
      // 将#标签转换为带样式的span
      return text.replace(/#([^#\s,.!?，。！？]+)/g, '<span class="tag">#$1</span>');
    },
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    async sendMessage(message) {
      // 添加调试日志
      console.log('Sending message:', message);
      
      // 如果没有传入消息，使用输入框的值
      const messageToSend = message || this.userInput;
      
      if (!messageToSend || (typeof messageToSend === 'string' && !messageToSend.trim())) {
        console.warn('Empty message, not sending');
        return;
      }

      // 添加用户消息
      const userMessage = {
        content: messageToSend,
        type: 'user',
        timestamp: new Date()
      };
      this.messages.push(userMessage);

      // 清空输入框
      this.userInput = '';
      this.showOptions = false;
      this.isWaitingForBot = true;

      try {
        // 调用智能体API
        console.log('正在调用智能体API...');
        
        const response = await fetch('http://localhost:3000/api/user/chat/proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: messageToSend,
            userId: localStorage.getItem('userId') || 'default_user',
            threadId: this.chatId
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        console.log('API response:', data);

        if (!data.success) {
          throw new Error(data.message || '未知错误');
        }

        // 获取回复内容
        const botResponse = data.message;
        
        if (!botResponse) {
          console.error('无法解析的响应数据:', data);
          throw new Error('无法解析机器人回复');
        }

        // 保存会话ID（如果存在）
        if (data.threadId) {
          this.chatId = data.threadId;
          console.log('Updated threadId:', this.chatId);
        }

        // 添加机器人消息
        const botMessage = {
          content: botResponse,
          type: 'bot',
          timestamp: new Date()
        };
        this.messages.push(botMessage);

        // 自动滚动到底部
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      } catch (error) {
        console.error('发送消息错误:', error);
        // 添加错误消息到聊天界面
        this.messages.push({
          content: `发送消息失败: ${error.message}`,
          type: 'bot',
          timestamp: new Date(),
          isError: true
        });
      } finally {
        this.isWaitingForBot = false;
      }
    },
    scrollToBottom() {
      const container = this.$refs.messages;
      container.scrollTop = container.scrollHeight;
    },
    scrollToTop() {
      this.$refs.chatContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    },
    handleScroll() {
      this.showBackToTop = this.$refs.chatContent.scrollTop > 300;
    },
    async fetchUserAvatar() {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`http://localhost:3000/api/avatar/${userId}`);
        const data = await response.json();
        
        if (response.ok && data.data.avatarUrl) {
          this.userAvatar = data.data.avatarUrl;
        } else {
          // 如果没有头像，使用默认头像
          this.userAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${localStorage.getItem('username')}`;
        }
      } catch (error) {
        console.error('获取头像失败:', error);
        this.userAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${localStorage.getItem('username')}`;
      }
    },
    async saveTags(tags) {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId || !tags.length) {
          console.error('无法保存标签：缺少用户ID或标签为空', {
            userId,
            tags
          });
          return;
        }

        console.log('正在保存标签:', { userId, tags });

        const response = await fetch('http://localhost:3000/api/user/save-tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            tags
          })
        });

        const data = await response.json();
        if (response.ok) {
          console.log('标签保存成功:', data);
          this.testCompleted = true;
        } else {
          throw new Error(data.message || '保存标签失败');
        }
      } catch (error) {
        console.error('保存标签时出错:', error);
        // 添加重试逻辑
        setTimeout(() => {
          console.log('尝试重新保存标签...');
          this.saveTags(tags);
        }, 1000);
      }
    }
  },
  async mounted() {
    await this.fetchUserAvatar();
    
    // 直接发送初始消息开始新的对话
    this.sendMessage("你好，我想开始性格测试");
    this.$refs.chatContent.addEventListener('scroll', this.handleScroll);
  },
  beforeUnmount() {
    this.$refs.chatContent.removeEventListener('scroll', this.handleScroll);
  }
}
</script>

<style scoped>
.chat-container {
  min-height: 100vh;
  background-color: #1a1a1a;
  color: #ffffff;
  padding-top: 70px; /* 为固定header留出空间 */
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  border-left: 1px solid #2a2a2a;
  border-right: 1px solid #2a2a2a;
}

.chat-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #2a2a2a;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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

.chat-content {
  flex: 1;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  height: calc(100vh - 80px); /* 减去header的高度 */
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 2rem;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
}

.message {
  display: flex;
  margin-bottom: 1.5rem;
  align-items: flex-start;
  width: 100%;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bot-message {
  justify-content: flex-start;
  margin-right: auto;
  max-width: 80%;
}

.user-message {
  justify-content: flex-end;
  flex-direction: row-reverse;
  margin-left: auto;
  max-width: 80%;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 1rem;
  flex-shrink: 0;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-content {
  background-color: #2a2a2a;
  padding: 1rem;
  border-radius: 12px;
  max-width: 70%;
  position: relative;
}

.bot-message .message-content {
  border-top-left-radius: 4px;
  margin-right: auto;
}

.user-message .message-content {
  background-color: #4CAF50;
  border-top-right-radius: 4px;
  margin-left: auto;
}

.message-content.isError {
  background-color: #ff4444;
  color: white;
  border-radius: 12px;
}

.message-text {
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.message-time {
  font-size: 0.8rem;
  color: #888;
  text-align: right;
}

.user-message .message-time {
  text-align: right;
}

.bot-message .message-time {
  text-align: left;
}

.input-container {
  display: flex;
  gap: 1rem;
  margin-top: auto;
  padding: 1rem;
  background-color: #1a1a1a;
  border-top: 1px solid #2a2a2a;
  position: sticky;
  bottom: 0;
}

input {
  flex: 1;
  padding: 1rem;
  background-color: #2a2a2a;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
}

input:focus {
  outline: none;
  box-shadow: 0 0 0 2px #4CAF50;
}

.send-btn {
  padding: 0 2rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.options-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.option-btn {
  padding: 0.8rem 1.5rem;
  background-color: #2a2a2a;
  border: 1px solid #4CAF50;
  color: #4CAF50;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  background-color: #4CAF50;
  color: white;
}

.tag {
  color: #4CAF50;
  font-weight: bold;
}

/* 自定义滚动条 */
.messages::-webkit-scrollbar {
  width: 8px;
}

.messages::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.messages::-webkit-scrollbar-thumb {
  background: #4a4a4a;
  border-radius: 4px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.back-to-top {
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.back-to-top:hover {
  transform: translateY(-2px);
  background-color: #45a049;
}
</style> 