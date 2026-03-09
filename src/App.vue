<template>
  <router-view></router-view>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
@import './assets/theme.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background-color: var(--bg-1);
  color: var(--text-1);
}

/*
 * 所有页面 header 中：两个切换按钮绝对定位在正中央
 */
.header-toggles {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 20;
}

/* 确保各页 header 有相对定位作为绝对定位的参考 */
.header,
.profile-header,
.page-header,
.results-header,
.chat-header,
.detail-header {
  position: relative;
}
</style>
