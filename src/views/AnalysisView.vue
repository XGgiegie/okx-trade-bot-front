<script setup>
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CandlestickChart, LineChart, BarChart } from 'echarts/charts'
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { ref, computed, onMounted, watch } from 'vue'
import { getProductList } from '@/api/product'

use([
  CanvasRenderer,
  CandlestickChart,
  LineChart,
  BarChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
])

const coins = ref([])
const selectedCoin = ref('')
const selectedPeriod = ref('1D')
const periods = ['15m', '1H', '4H', '1D', '1W']

// 行情统计
const stats = ref({ price: '--', change: '--', up: true, high: '--', low: '--', volume: '--' })

// K线数据 [open, close, low, high]
const klineRaw = ref([])
const dates = computed(() => klineRaw.value.map((k) => k[0]))

const klineOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
  legend: { data: ['K线', 'MA5', 'MA10'], top: 4 },
  grid: [
    { left: '3%', right: '4%', top: '10%', height: '58%', containLabel: true },
    { left: '3%', right: '4%', top: '74%', height: '18%', containLabel: true },
  ],
  xAxis: [
    { type: 'category', data: dates.value, gridIndex: 0 },
    { type: 'category', data: dates.value, gridIndex: 1, axisLabel: { show: false } },
  ],
  yAxis: [
    { type: 'value', scale: true, gridIndex: 0 },
    { type: 'value', gridIndex: 1 },
  ],
  dataZoom: [{ type: 'inside', xAxisIndex: [0, 1], start: 0, end: 100 }],
  series: [
    {
      name: 'K线',
      type: 'candlestick',
      xAxisIndex: 0,
      yAxisIndex: 0,
      data: klineRaw.value.map((k) => [k[1], k[2], k[3], k[4]]),
      itemStyle: {
        color: '#10b981',
        color0: '#ef4444',
        borderColor: '#10b981',
        borderColor0: '#ef4444',
      },
    },
    {
      name: 'MA5',
      type: 'line',
      xAxisIndex: 0,
      yAxisIndex: 0,
      data: [],
      smooth: true,
      lineStyle: { color: '#6366f1', width: 1 },
      itemStyle: { color: '#6366f1' },
      connectNulls: true,
    },
    {
      name: 'MA10',
      type: 'line',
      xAxisIndex: 0,
      yAxisIndex: 0,
      data: [],
      smooth: true,
      lineStyle: { color: '#f59e0b', width: 1 },
      itemStyle: { color: '#f59e0b' },
      connectNulls: true,
    },
    {
      name: '成交量',
      type: 'bar',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: [],
      itemStyle: { color: '#6366f1', opacity: 0.7 },
    },
  ],
}))

async function fetchKline() {
  if (!selectedCoin.value) return
  // TODO: 接入真实 K线接口
  // const res = await getKlineData(selectedCoin.value, selectedPeriod.value)
  // klineRaw.value = res
  klineRaw.value = []
}

watch([selectedCoin, selectedPeriod], fetchKline)

onMounted(async () => {
  const res = await getProductList()
  const list = Array.isArray(res) ? res : []
  coins.value = list.map((p) => ({ label: p.instId, value: p.instId }))
  if (coins.value.length) selectedCoin.value = coins.value[0].value
})
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">币种分析</h1>
        <p class="mt-1 text-sm text-gray-500">K线图及技术指标分析</p>
      </div>
    </div>

    <!-- Coin selector & period -->
    <el-card shadow="hover" class="mb-4">
      <div class="flex flex-wrap items-center gap-4">
        <el-segmented v-model="selectedCoin" :options="coins" size="large" />
        <el-divider direction="vertical" />
        <el-radio-group v-model="selectedPeriod" size="default">
          <el-radio-button v-for="p in periods" :key="p" :value="p">{{ p }}</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>

    <!-- Coin Stats -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <p class="text-xs text-gray-400">最新价</p>
          <p class="mt-1 text-xl font-bold text-gray-900">{{ stats.price }}</p>
          <el-tag :type="stats.up ? 'success' : 'danger'" size="small">{{ stats.change }}</el-tag>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <p class="text-xs text-gray-400">24h 最高</p>
          <p class="mt-1 text-xl font-bold text-green-600">{{ stats.high }}</p>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <p class="text-xs text-gray-400">24h 最低</p>
          <p class="mt-1 text-xl font-bold text-red-500">{{ stats.low }}</p>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="text-center">
          <p class="text-xs text-gray-400">24h 成交量</p>
          <p class="mt-1 text-xl font-bold text-gray-900">{{ stats.volume }}</p>
        </el-card>
      </el-col>
    </el-row>

    <!-- Kline Chart -->
    <el-card shadow="hover">
      <template #header>
        <span class="font-semibold">{{ selectedCoin }}/USDT · {{ selectedPeriod }} K线图</span>
      </template>
      <v-chart :option="klineOption" style="height: 500px" autoresize />
    </el-card>
  </div>
</template>
