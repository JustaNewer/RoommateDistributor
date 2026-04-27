<template>
  <div class="questionnaire-page">
    <header class="q-header">
      <button class="back-btn" @click="handleBack">
        {{ $t('common.back') }}
      </button>
      <h1>{{ $t('questionnaire.title') }}</h1>
      <div class="header-toggles">
        <ThemeToggle />
        <LangToggle />
      </div>
    </header>

    <main class="q-main">
      <!-- 进度条 -->
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-text">{{ currentIndex + 1 }} / {{ questions.length }}</span>
      </div>

      <!-- 问题卡片区域 -->
      <div class="card-area">
        <transition :name="slideDir" mode="out-in">
          <div class="question-card" :key="currentIndex">
            <span class="q-number">Q{{ currentIndex + 1 }}</span>
            <p class="q-dimension">{{ questions[currentIndex].dimension }}</p>
            <h2 class="q-text">{{ questions[currentIndex].text }}</h2>

            <div class="options-group">
              <label
                v-for="(opt, oi) in options"
                :key="oi"
                class="option-label"
                :class="{ selected: answers[currentIndex] === opt.value }"
              >
                <input
                  type="radio"
                  :name="'q' + currentIndex"
                  :value="opt.value"
                  v-model="answers[currentIndex]"
                  class="sr-only"
                />
                <span class="option-radio">
                  <span class="radio-dot"></span>
                </span>
                <span class="option-text">{{ opt.label }}</span>
              </label>
            </div>
          </div>
        </transition>
      </div>

      <!-- 底部导航 -->
      <div class="nav-buttons">
        <button
          class="nav-btn prev-btn"
          :disabled="currentIndex === 0"
          @click="prev"
        >
          {{ $t('questionnaire.prev') }}
        </button>

        <div class="dot-indicators">
          <span
            v-for="(q, i) in questions"
            :key="i"
            class="dot"
            :class="{ active: i === currentIndex, answered: answers[i] != null }"
            @click="jumpTo(i)"
          ></span>
        </div>

        <button
          v-if="currentIndex < questions.length - 1"
          class="nav-btn next-btn"
          :disabled="answers[currentIndex] == null"
          @click="next"
        >
          {{ $t('questionnaire.next') }}
        </button>
        <button
          v-else
          class="nav-btn submit-btn"
          :disabled="!allAnswered || submitting"
          @click="submit"
        >
          {{ submitting ? $t('questionnaire.submitting') : $t('questionnaire.submit') }}
        </button>
      </div>

      <!-- 完成状态 -->
      <transition name="fade">
        <div v-if="completed" class="result-overlay">
          <div class="result-card">
            <div class="result-icon">&#10003;</div>
            <h2>{{ $t('questionnaire.completeTitle') }}</h2>
            <p>{{ $t('questionnaire.completeDesc') }}</p>
            <div class="vector-display">
              <span v-for="(v, i) in answers" :key="i" class="vec-chip">
                Q{{ i + 1 }}: {{ v }}
              </span>
            </div>
            <button class="nav-btn next-btn" @click="goBack">
              {{ $t('questionnaire.backToProfile') }}
            </button>
          </div>
        </div>
      </transition>
    </main>
  </div>
</template>

<script>
import ThemeToggle from '../components/ThemeToggle.vue'
import LangToggle from '../components/LangToggle.vue'

export default {
  name: 'QuestionnaireTest',
  components: { ThemeToggle, LangToggle },
  data() {
    return {
      currentIndex: 0,
      slideDir: 'slide-left',
      answers: Array(9).fill(null),
      submitting: false,
      completed: false,
      questions: [
        { dimension: this.$t('questionnaire.dim1'), text: this.$t('questionnaire.q1') },
        { dimension: this.$t('questionnaire.dim2'), text: this.$t('questionnaire.q2') },
        { dimension: this.$t('questionnaire.dim3'), text: this.$t('questionnaire.q3') },
        { dimension: this.$t('questionnaire.dim4'), text: this.$t('questionnaire.q4') },
        { dimension: this.$t('questionnaire.dim5'), text: this.$t('questionnaire.q5') },
        { dimension: this.$t('questionnaire.dim6'), text: this.$t('questionnaire.q6') },
        { dimension: this.$t('questionnaire.dim7'), text: this.$t('questionnaire.q7') },
        { dimension: this.$t('questionnaire.dim8'), text: this.$t('questionnaire.q8') },
        { dimension: this.$t('questionnaire.dim9'), text: this.$t('questionnaire.q9') },
      ]
    }
  },
  computed: {
    options() {
      return [
        { label: this.$t('questionnaire.opt1'), value: 1 },
        { label: this.$t('questionnaire.opt2'), value: 2 },
        { label: this.$t('questionnaire.opt3'), value: 3 },
        { label: this.$t('questionnaire.opt4'), value: 4 },
        { label: this.$t('questionnaire.opt5'), value: 5 },
      ]
    },
    progressPercent() {
      return ((this.currentIndex + 1) / this.questions.length) * 100
    },
    allAnswered() {
      return this.answers.every(a => a != null)
    }
  },
  methods: {
    localePath(path) {
      return this.$i18n.locale === 'en' ? '/en' + path : path
    },
    handleBack() {
      this.$router.push(this.localePath('/profile'))
    },
    next() {
      if (this.answers[this.currentIndex] == null) return
      this.slideDir = 'slide-left'
      this.currentIndex++
    },
    prev() {
      if (this.currentIndex <= 0) return
      this.slideDir = 'slide-right'
      this.currentIndex--
    },
    jumpTo(i) {
      this.slideDir = i > this.currentIndex ? 'slide-left' : 'slide-right'
      this.currentIndex = i
    },
    async submit() {
      if (!this.allAnswered || this.submitting) return
      this.submitting = true
      try {
        const userId = localStorage.getItem('userId')
        const response = await fetch('http://localhost:3000/api/user/save-vector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, vector: [...this.answers] })
        })
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.message || '保存失败')
        }
        this.completed = true
      } catch (err) {
        console.error('提交问卷失败:', err)
        alert(err.message || '提交失败，请重试')
      } finally {
        this.submitting = false
      }
    },
    goBack() {
      this.$router.push(this.localePath('/profile'))
    }
  }
}
</script>

<style scoped>
/* ─── 屏幕阅读器辅助 ─── */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  border: 0;
}

/* ─── 页面布局 ─── */
.questionnaire-page {
  min-height: 100vh;
  background-color: var(--bg-1);
  color: var(--text-1);
  display: flex;
  flex-direction: column;
}

.q-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--bg-2);
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  box-shadow: 0 2px 8px var(--shadow-sm);
}
.q-header h1 { flex: 1; font-size: 1.15rem; }

.back-btn {
  background: none;
  border: 2px solid var(--accent);
  color: var(--accent);
  padding: 0.45rem 1.1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color 0.2s, transform 0.2s;
}
.back-btn:hover {
  background-color: var(--accent-light);
  transform: translateY(-1px);
}

/* ─── 主体 ─── */
.q-main {
  flex: 1;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
}

/* ─── 进度条 ─── */
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.progress-bar {
  flex: 1;
  height: 6px;
  background-color: var(--bg-3);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #66bb6a);
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(.4,0,.2,1);
}
.progress-text {
  font-size: 0.85rem;
  color: var(--text-3);
  white-space: nowrap;
}

/* ─── 卡片区域 ─── */
.card-area {
  position: relative;
  min-height: 380px;
}

.question-card {
  background-color: var(--bg-2);
  border-radius: 16px;
  padding: 2.2rem 2rem;
  box-shadow: 0 4px 24px var(--shadow-sm);
  border: 1px solid var(--border);
}

.q-number {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--accent);
  background: var(--accent-light);
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
  margin-bottom: 0.6rem;
}

.q-dimension {
  font-size: 0.85rem;
  color: var(--text-3);
  margin-bottom: 0.5rem;
}

.q-text {
  font-size: 1.1rem;
  line-height: 1.65;
  font-weight: 500;
  margin-bottom: 1.6rem;
}

/* ─── 选项 ─── */
.options-group {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1.1rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-solid);
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, transform 0.15s;
}
.option-label:hover {
  border-color: var(--accent);
  background-color: var(--accent-light);
}
.option-label.selected {
  border-color: var(--accent);
  background-color: var(--accent-light);
}
.option-label:active { transform: scale(0.985); }

.option-radio {
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 2px solid var(--border-solid);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.2s;
}
.option-label.selected .option-radio { border-color: var(--accent); }

.radio-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background-color: transparent;
  transition: background-color 0.2s;
}
.option-label.selected .radio-dot { background-color: var(--accent); }

.option-text {
  font-size: 0.95rem;
  color: var(--text-2);
}
.option-label.selected .option-text { color: var(--text-1); font-weight: 500; }

/* ─── 底部导航 ─── */
.nav-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.dot-indicators {
  display: flex;
  gap: 6px;
}
.dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background-color: var(--bg-3);
  cursor: pointer;
  transition: background-color 0.25s, transform 0.2s;
}
.dot.answered { background-color: var(--accent); opacity: 0.45; }
.dot.active { background-color: var(--accent); opacity: 1; transform: scale(1.3); }

.nav-btn {
  padding: 0.65rem 1.8rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s, transform 0.15s;
}
.nav-btn:active { transform: scale(0.97); }
.nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.prev-btn {
  background: var(--bg-3);
  color: var(--text-2);
}
.prev-btn:hover:not(:disabled) { opacity: 0.85; }

.next-btn, .submit-btn {
  background: var(--accent);
  color: #fff;
}
.next-btn:hover:not(:disabled),
.submit-btn:hover:not(:disabled) { opacity: 0.9; }

/* ─── 完成遮罩 ─── */
.result-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 2rem;
}
.result-card {
  background: var(--bg-2);
  border-radius: 20px;
  padding: 2.5rem 2rem;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 16px 48px rgba(0,0,0,0.25);
}
.result-icon {
  width: 56px; height: 56px;
  margin: 0 auto 1rem;
  background: var(--accent);
  color: #fff;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem;
  font-weight: 700;
}
.result-card h2 { margin-bottom: 0.6rem; }
.result-card p { color: var(--text-3); margin-bottom: 1.2rem; line-height: 1.5; }

.vector-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}
.vec-chip {
  background: var(--accent-light);
  color: var(--accent);
  padding: 0.3rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
}

/* ─── 过渡动画 ─── */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.35s cubic-bezier(.4,0,.2,1);
}
.slide-left-enter-from  { opacity: 0; transform: translateX(60px); }
.slide-left-leave-to    { opacity: 0; transform: translateX(-60px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-60px); }
.slide-right-leave-to   { opacity: 0; transform: translateX(60px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ─── 响应式 ─── */
@media (max-width: 480px) {
  .q-main { padding: 1.2rem 1rem 2rem; }
  .question-card { padding: 1.5rem 1.2rem; }
  .q-text { font-size: 1rem; }
  .nav-btn { padding: 0.55rem 1.2rem; font-size: 0.88rem; }
}
</style>
