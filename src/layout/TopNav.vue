<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const pageTitle = computed(() => {
  const map = { '/': '仪表盘', '/analysis': '币种分析', '/contract': '合约管理' }
  return map[route.path] || ''
})
</script>

<template>
  <header class="topnav">
    <div class="breadcrumb">
      <span class="bc-root">OKX 量化</span>
      <span class="bc-sep">/</span>
      <span class="bc-current">{{ pageTitle }}</span>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.topnav {
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 28px;
  background: #ffffff;
  border-bottom: 1px solid #eaecf0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bc-root {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

.bc-sep {
  font-size: 13px;
  color: #d1d5db;
}

.bc-current {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}
</style>
