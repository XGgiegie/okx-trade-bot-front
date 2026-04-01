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
import { ref, shallowRef, computed, onMounted, onUnmounted, watch, nextTick, inject } from 'vue'
import { getProductList } from '@/api/product'
import { getMarkPriceCandles } from '@/api/k_line'

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
const wsSend = inject('wsSend', null)
const wsOn = inject('wsOn', null)
const wsOff = inject('wsOff', null)

const coins = ref([])
const selectedCoin = ref('')
const selectedPeriod = ref('1Dutc')
const periods = ['1m', '15m', '30m', '1H', '4H', '1Dutc', '1Wutc']

// 行情统计
const stats = ref({ price: '--', change: '--', up: true, high: '--', low: '--', volume: '--' })

const chartRef = ref(null)
const isFetchingMore = ref(false)
// 普通变量，不触发 computed 重算
let savedZoom = { start: 50, end: 100 }

// K线数据 [日期, open, close, low, high, rawTs]（shallowRef：WS index 赋值不触发 computed）
const klineRaw = shallowRef([])
const dates = computed(() => klineRaw.value.map((k) => k[0]))

// 计算移动均线
function calcMA(closes, n) {
  return closes.map((_, i) => {
    if (i < n - 1) return null
    const sum = closes.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0)
    return +(sum / n).toFixed(4)
  })
}

const klineOption = computed(() => {
  const closes = klineRaw.value.map((k) => Number(k[2]))
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['K线', 'MA5', 'MA10'], top: 4 },
    grid: [
      { left: '3%', right: '4%', top: '10%', height: '58%', containLabel: true },
      { left: '3%', right: '4%', top: '74%', height: '18%', containLabel: true },
    ],
    xAxis: [
      { type: 'category', data: dates.value, gridIndex: 0, barCategoryGap: '0%' },
      { type: 'category', data: dates.value, gridIndex: 1, axisLabel: { show: false } },
    ],
    yAxis: [
      { type: 'value', scale: true, gridIndex: 0 },
      { type: 'value', gridIndex: 1 },
    ],
    dataZoom: [{ type: 'inside', xAxisIndex: [0, 1], start: savedZoom.start, end: savedZoom.end }],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        xAxisIndex: 0,
        yAxisIndex: 0,
        barMaxWidth: 8,
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
        data: calcMA(closes, 5),
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
        data: calcMA(closes, 10),
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
  }
})

// 根据周期格式化时间轴标签
function fmtTs(ts) {
  const d = new Date(Number(ts))
  if (['1Dutc', '1Wutc', '1D', '1W'].includes(selectedPeriod.value)) {
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function fetchKline() {
  if (!selectedCoin.value) return
  isFetchingMore.value = false
  savedZoom = { start: 50, end: 100 }
  const res = await getMarkPriceCandles({
    instId: selectedCoin.value,
    bar: selectedPeriod.value,
    limit: '100',
  })
  const list = Array.isArray(res) ? res : []
  const sorted = [...list].reverse()

  // klineRaw 格式: [日期, open, close, low, high, rawTs]
  klineRaw.value = sorted.map((item) => [
    fmtTs(item.ts),
    item.open,
    item.close,
    item.low,
    item.high,
    item.ts,
  ])

  // 更新行情统计
  if (sorted.length) {
    const latest = sorted[sorted.length - 1]
    const first = sorted[0]
    const changeVal = (
      ((Number(latest.close) - Number(first.close)) / Number(first.close)) *
      100
    ).toFixed(2)
    stats.value = {
      price: Number(latest.close).toFixed(2),
      change: `${Number(changeVal) >= 0 ? '+' : ''}${changeVal}%`,
      up: Number(changeVal) >= 0,
      high: Math.max(...sorted.map((k) => Number(k.high))).toFixed(2),
      low: Math.min(...sorted.map((k) => Number(k.low))).toFixed(2),
      volume: '--',
    }
  }
}

function sendWsUnsubscribe(instId, bar) {
  if (!instId || typeof wsSend !== 'function') return
  wsSend(JSON.stringify({ type: 'unsubscribe', instId, bar }))
}

function sendWsSubscribe() {
  if (!selectedCoin.value || typeof wsSend !== 'function') return
  wsSend(
    JSON.stringify({ type: 'subscribe', instId: selectedCoin.value, bar: selectedPeriod.value }),
  )
}

// 放大/拖动时保存缩放状态，并在左侧边缘预加载历史数据
async function handleDataZoom(evt) {
  // inside dataZoom 事件有时以 batch 数组形式推送
  const dz = evt?.batch?.[0] ?? evt
  if (!dz) return

  // 保存当前缩放状态到普通变量（不触发 computed），直接用事件数据，避免 chart.getOption() 深拷贝
  savedZoom.start = dz.start ?? 50
  savedZoom.end = dz.end ?? 100

  if (isFetchingMore.value || !klineRaw.value.length) return
  const startValue = dz.startValue ?? 0
  const endValue = dz.endValue ?? klineRaw.value.length - 1
  // 左拉触底（startValue === 0）才请求历史数据
  if (startValue > 0) return

  const chart = chartRef.value?.chart
  if (!chart) return

  isFetchingMore.value = true
  try {
    const earliestTs = klineRaw.value[0][5]
    const res = await getMarkPriceCandles({
      instId: selectedCoin.value,
      bar: selectedPeriod.value,
      limit: '100',
      after: earliestTs,
    })
    const list = Array.isArray(res) ? res : []
    if (!list.length) return
    const sorted = [...list].reverse()
    const newRows = sorted.map((item) => [
      fmtTs(item.ts),
      item.open,
      item.close,
      item.low,
      item.high,
      item.ts,
    ])
    klineRaw.value = [...newRows, ...klineRaw.value]
    // 插入 N 条后，把视口索引整体右移 N，保持当前可见区域不变
    await nextTick()
    chart.dispatchAction({
      type: 'dataZoom',
      dataZoomIndex: 0,
      startValue: newRows.length + startValue,
      endValue: newRows.length + endValue,
    })
  } finally {
    isFetchingMore.value = false
  }
}

watch([selectedCoin, selectedPeriod], ([,], [oldCoin, oldBar]) => {
  sendWsUnsubscribe(oldCoin, oldBar)
  fetchKline()
  sendWsSubscribe()
})

// 处理 WS 推送的实时 K 线数据（直接操作 ECharts 实例，不触发整体重渲染）
function handleWsMessage(raw) {
  let msg
  try {
    msg = JSON.parse(raw)
  } catch {
    return
  }
  if (msg.event !== 'kline_data' || !Array.isArray(msg.data) || !msg.data.length) return

  const pushInstId = msg.arg?.instId
  if (pushInstId !== selectedCoin.value) return

  const item = msg.data[0]
  const row = [fmtTs(item.ts), item.open, item.close, item.low, item.high, item.ts]

  if (!klineRaw.value.length) return

  const lastRow = klineRaw.value[klineRaw.value.length - 1]

  if (lastRow[5] === item.ts) {
    klineRaw.value[klineRaw.value.length - 1] = row
  } else {
    klineRaw.value.push(row)
  }

  // 直接增量更新 ECharts，不触发 computed 重算（保留 dataZoom 状态）
  const chart = chartRef.value?.chart
  if (chart) {
    const closes = klineRaw.value.map((k) => Number(k[2]))
    chart.setOption({
      xAxis: [{ data: klineRaw.value.map((k) => k[0]) }, { data: klineRaw.value.map((k) => k[0]) }],
      series: [
        { data: klineRaw.value.map((k) => [k[1], k[2], k[3], k[4]]) },
        { data: calcMA(closes, 5) },
        { data: calcMA(closes, 10) },
        { data: [] },
      ],
    })
  }

  // 更新统计卡片
  stats.value.price = Number(item.close).toFixed(2)
  const firstClose = Number(klineRaw.value[0][2])
  if (firstClose) {
    const changeVal = (((Number(item.close) - firstClose) / firstClose) * 100).toFixed(2)
    stats.value.change = `${Number(changeVal) >= 0 ? '+' : ''}${changeVal}%`
    stats.value.up = Number(changeVal) >= 0
  }
  stats.value.high = Math.max(...klineRaw.value.map((k) => Number(k[4]))).toFixed(2)
  stats.value.low = Math.min(...klineRaw.value.map((k) => Number(k[3]))).toFixed(2)
}

onUnmounted(() => {
  // 退出组件时取消订阅并注销消息监听
  sendWsUnsubscribe(selectedCoin.value, selectedPeriod.value)
  if (wsOff) wsOff(handleWsMessage)
})

onMounted(async () => {
  if (wsOn) wsOn(handleWsMessage)
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
      <v-chart
        ref="chartRef"
        :option="klineOption"
        style="height: 500px"
        autoresize
        @datazoom="handleDataZoom"
      />
    </el-card>
  </div>
</template>
