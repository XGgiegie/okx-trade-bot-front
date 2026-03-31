<script setup>
import SideBar from './SideBar.vue'
import TopNav from './TopNav.vue'
</script>

<template>
  <div class="layout">
    <SideBar />
    <div class="main-wrapper">
      <TopNav />
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f4f6fb;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
