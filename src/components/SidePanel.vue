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
      <div v-if="modelValue" class="panel-content" ref="panel">
        <slot></slot>
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
      el.style.height = '0';
      el.style.opacity = '0';
    },
    enter(el) {
      const height = el.scrollHeight;
      el.style.height = height + 'px';
      el.style.opacity = '1';
    },
    beforeLeave(el) {
      el.style.height = el.scrollHeight + 'px';
    },
    leave(el) {
      el.style.height = '0';
      el.style.opacity = '0';
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

.panel-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.panel-enter-active,
.panel-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-50% - 20px));
}
</style> 