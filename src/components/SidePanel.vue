<template>
  <div class="side-panel-container">
    <div class="button-container" :class="{ 'panel-open': modelValue }">
      <slot name="trigger"></slot>
    </div>
    <Transition
      name="panel"
      @before-enter="beforeEnter"
      @enter="enter"
      @before-leave="beforeLeave"
      @leave="leave"
    >
      <div v-if="modelValue" class="panel-overlay" @click="handleOverlayClick">
        <div class="panel-content" ref="panel" @click.stop>
          <slot></slot>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
export default {
  name: 'SidePanel',
  props: {
    modelValue: {
      type: Boolean,
      required: true
    }
  },
  methods: {
    beforeEnter(el) {
      el.style.opacity = '0';
    },
    enter(el) {
      el.style.opacity = '1';
    },
    beforeLeave(el) {
      el.style.opacity = '1';
    },
    leave(el) {
      el.style.opacity = '0';
    },
    handleOverlayClick() {
      this.$emit('update:modelValue', false);
    }
  }
}
</script>

<style scoped>
.side-panel-container {
  position: relative;
  width: 100%;
}

.button-container {
  position: relative;
  z-index: 2;
  width: 100%;
}

.panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: transparent;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding-top: 180px;
}

.panel-content {
  background-color: #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.panel-enter-active,
.panel-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}

.panel-enter-from .panel-content {
  transform: translateY(-20px);
}

.panel-leave-to .panel-content {
  transform: translateY(-20px);
}
</style> 