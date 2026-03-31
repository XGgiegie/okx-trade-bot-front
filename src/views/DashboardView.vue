<script setup>
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { ref } from 'vue'
import { CaretTop, CaretBottom } from '@element-plus/icons-vue'

use([CanvasRenderer, LineChart, BarChart, TooltipComponent, GridComponent, LegendComponent])

const stats = [
  { label: '总市值', value: '$2.34T', change: '+3.2%', up: true },
  { label: '24h 成交量', value: '$98.6B', change: '+12.5%', up: true },
  { label: 'BTC 占比', value: '52.4%', change: '+0.8%', up: true },
  { label: '恐慌贪婪指数', value: '68 贪婪', change: '+5', up: true },
]

const priceChartOption = ref({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    data: ['03-25', '03-26', '03-27', '03-28', '03-29', '03-30', '03-31'],
  },
  yAxis: {
    type: 'value',
    axisLabel: { formatter: (v) => '$' + (v / 1000).toFixed(0) + 'k' },
  },
  series: [
    {
      name: 'BTC/USDT',
      type: 'line',
      smooth: true,
      data: [82100, 83400, 81900, 84500, 86200, 85100, 87300],
      itemStyle: { color: '#f59e0b' },
      areaStyle: { color: 'rgba(245,158,11,0.1)' },
    },
  ],
})

const volumeChartOption = ref({
  tooltip: { trigger: 'axis' },
  legend: { data: ['BTC', 'ETH', 'SOL'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    data: ['03-25', '03-26', '03-27', '03-28', '03-29', '03-30', '03-31'],
  },
  yAxis: {
    type: 'value',
    axisLabel: { formatter: (v) => (v / 1e9).toFixed(1) + 'B' },
  },
  series: [
    { name: 'BTC', type: 'bar', data: [28, 31, 25, 34, 29, 27, 33].map((v) => v * 1e9), itemStyle: { color: '#f59e0b' } },
    { name: 'ETH', type: 'bar', data: [18, 21, 16, 22, 19, 17, 20].map((v) => v * 1e9), itemStyle: { color: '#6366f1' } },
    { name: 'SOL', type: 'bar', data: [8, 9, 7, 10, 8, 7, 9].map((v) => v * 1e9), itemStyle: { color: '#10b981' } },
  ],
})
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">仪表盘</h1>
      <p class="mt-1 text-sm text-gray-500">加密货币市场概览</p>
    </div>

    <el-row :gutter="20" class="mb-6">
      <el-col :xs="24" :sm="12" :lg="6" v-for="stat in stats" :key="stat.label">
        <el-card shadow="hover" class="mb-4">
          <p class="text-sm text-gray-500">{{ stat.label }}</p>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl font-bold text-gray-900">{{ stat.value }}</span>
            <span
              class="flex items-center text-sm font-medium"
              :class="stat.up ? 'text-green-600' : 'text-red-500'"
            >
              <el-icon :size="13"><CaretTop v-if="stat.up" /><CaretBottom v-else /></el-icon>
              {{ stat.change }}
            </span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :xs="24" :lg="14">
        <el-card shadow="hover" class="mb-6">
          <template #header>BTC/USDT 价格走势（近7日）</template>
          <v-chart :option="priceChartOption" style="height: 280px" autoresize />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="10">
        <el-card shadow="hover" class="mb-6">
          <template #header>主流币种成交量对比</template>
          <v-chart :option="volumeChartOption" style="height: 280px" autoresize />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
