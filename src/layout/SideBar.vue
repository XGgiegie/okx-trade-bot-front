<script setup>
import { useRoute } from 'vue-router'
import { Odometer, TrendCharts, Document } from '@element-plus/icons-vue'

const route = useRoute()

const menuItems = [
  { path: '/', label: '仪表盘', icon: Odometer },
  { path: '/analysis', label: '币种分析', icon: TrendCharts },
  { path: '/contract', label: '合约管理', icon: Document },
]
</script>

<template>
  <aside class="sidebar">
    <div class="logo">
      <div class="logo-badge">₿</div>
      <span class="logo-text">OKX 分析</span>
    </div>
    <nav class="menu">
      <p class="menu-label">导航</p>
      <RouterLink
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="menu-item"
        :class="{ active: route.path === item.path }"
      >
        <el-icon :size="17"><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style lang="scss" scoped>
.sidebar {
  width: 240px;
  flex-shrink: 0;
  height: 100%;
  background: #ffffff;
  border-right: 1px solid #eaecf0;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  border-bottom: 1px solid #eaecf0;
}

.logo-badge {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.menu {
  flex: 1;
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 0 10px;
  margin: 0 0 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  color: #6b7280;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: #f9fafb;
    color: #1f2937;
  }

  &.active {
    background: #eef2ff;
    color: #4f46e5;
    font-weight: 600;
  }
}
</style>
