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
const stats = ref({
  price: '--',
  change: '--',
  up: true,
  high: '--',
  low: '--',
  volume: '--',
  trendType: '--',
})

const chartRef = ref(null)
const isFetchingMore = ref(false)
// 普通变量，不触发 computed 重算
let savedZoom = { start: 50, end: 100 }
let lastFetchMoreTime = 0 // 加载历史数据的冷却时间戳

// legend 选中状态（独立 ref，防止 computed 重算覆盖用户操作）
const legendSelected = ref({
  K线: true,
  MA5: false,
  MA10: false,
  MA20: false,
  EMA12: false,
  EMA26: false,
  BOLL上: false,
  BOLL中: false,
  BOLL下: false,
  通道上: true,
  通道中: true,
  通道下: true,
  趋势线: true,
  趋势上轨: true,
  趋势下轨: true,
  成交量: true,
  DIF: false,
  DEA: false,
  MACD: false,
  K: false,
  D: false,
  J: false,
  RSI6: false,
  RSI12: false,
  RSI24: false,
})

function handleLegendChanged(params) {
  legendSelected.value = { ...params.selected }
}

// K线数据，每项为对象: { date, ts, open, close, low, high, vol, ma5, ma10, ma20, ema12, ema26, dif, dea, macd, channelUp, channelMid, channelDn, bollUp, bollMid, bollDn, k, d, j, rsi6, rsi12, rsi24 }
const klineRaw = shallowRef([])
const trendInfo = shallowRef(null)

// 根据周期格式化时间轴标签
function fmtTs(ts) {
  const d = new Date(Number(ts))
  if (['1Dutc', '1Wutc', '1D', '1W'].includes(selectedPeriod.value)) {
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toNum(v) {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function mapToRow(item) {
  return {
    date: fmtTs(item.ts),
    ts: item.ts,
    open: item.open,
    close: item.close,
    low: item.low,
    high: item.high,
    vol: item.vol,
    ma5: item.ma5,
    ma10: item.ma10,
    ma20: item.ma20,
    ema12: item.ema12,
    ema26: item.ema26,
    bollUp: item.bollUp,
    bollMid: item.bollMid,
    bollDn: item.bollDn,
    k: item.k,
    d: item.d,
    j: item.j,
    rsi6: item.rsi6,
    rsi12: item.rsi12,
    rsi24: item.rsi24,
    dif: item.dif,
    dea: item.dea,
    macd: item.macd,
    channelUp: item.channelUp,
    channelMid: item.channelMid,
    channelDn: item.channelDn,
    trendType: item.trendType,
  }
}

// 根据 trendInfo 计算趋势线、上轨、下轨数据（y = m*x + b，x 为服务端绝对索引）
function computeTrendSeriesData(data) {
  const trend = trendInfo.value
  if (!trend || !trend.valid) return [[], [], []]
  const startIdx = data.findIndex((k) => Number(k.ts) === Number(trend.startTs))
  if (startIdx < 0) return [[], [], []]
  const trendLineArr = [],
    trendUpperArr = [],
    trendLowerArr = []
  for (let i = 0; i < data.length; i++) {
    if (i < startIdx) {
      trendLineArr.push(null)
      trendUpperArr.push(null)
      trendLowerArr.push(null)
    } else {
      const x = trend.startIndex + (i - startIdx)
      trendLineArr.push(+(trend.m * x + trend.b).toFixed(4))
      trendUpperArr.push(+(trend.m * x + trend.upperB).toFixed(4))
      trendLowerArr.push(+(trend.m * x + trend.lowerB).toFixed(4))
    }
  }
  return [trendLineArr, trendUpperArr, trendLowerArr]
}

const klineOption = computed(() => {
  const data = klineRaw.value
  const dates = data.map((k) => k.date)
  const [trendLineData, trendUpperData, trendLowerData] = computeTrendSeriesData(data)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: [
      {
        data: [
          'K线',
          'MA5',
          'MA10',
          'MA20',
          'EMA12',
          'EMA26',
          'BOLL上',
          'BOLL中',
          'BOLL下',
          '通道上',
          '通道中',
          '通道下',
          '趋势线',
          '趋势上轨',
          '趋势下轨',
        ],
        selected: legendSelected.value,
        top: 2,
        left: '9%',
        itemWidth: 14,
        itemHeight: 2,
        textStyle: { fontSize: 11 },
      },
      {
        data: ['DIF', 'DEA', 'MACD'],
        selected: legendSelected.value,
        top: '50%',
        left: '9%',
        itemWidth: 14,
        itemHeight: 2,
        textStyle: { fontSize: 10 },
      },
      {
        data: ['K', 'D', 'J'],
        selected: legendSelected.value,
        top: '62%',
        left: '9%',
        itemWidth: 14,
        itemHeight: 2,
        textStyle: { fontSize: 10 },
      },
      {
        data: ['RSI6', 'RSI12', 'RSI24'],
        selected: legendSelected.value,
        top: '74%',
        left: '9%',
        itemWidth: 14,
        itemHeight: 2,
        textStyle: { fontSize: 10 },
      },
    ],
    grid: [
      { left: '8%', right: '2%', top: '6%', height: '34%', containLabel: false },
      { left: '8%', right: '2%', top: '42%', height: '7%', containLabel: false },
      { left: '8%', right: '2%', top: '51%', height: '10%', containLabel: false },
      { left: '8%', right: '2%', top: '63%', height: '10%', containLabel: false },
      { left: '8%', right: '2%', top: '75%', height: '10%', containLabel: false },
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        gridIndex: 0,
        axisLabel: { show: false },
        axisLine: { onZero: false },
      },
      { type: 'category', data: dates, gridIndex: 1, axisLabel: { show: false } },
      { type: 'category', data: dates, gridIndex: 2, axisLabel: { show: false } },
      { type: 'category', data: dates, gridIndex: 3, axisLabel: { show: false } },
      { type: 'category', data: dates, gridIndex: 4, axisLabel: { show: true, fontSize: 10 } },
    ],
    yAxis: [
      { type: 'value', scale: true, gridIndex: 0, splitNumber: 4, axisLabel: { fontSize: 10 } },
      { type: 'value', gridIndex: 1, splitNumber: 2, axisLabel: { show: false } },
      { type: 'value', scale: true, gridIndex: 2, splitNumber: 3, axisLabel: { fontSize: 9 } },
      { type: 'value', scale: true, gridIndex: 3, splitNumber: 3, axisLabel: { fontSize: 9 } },
      { type: 'value', gridIndex: 4, min: 0, max: 100, splitNumber: 2, axisLabel: { fontSize: 9 } },
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1, 2, 3, 4], start: savedZoom.start, end: savedZoom.end },
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        xAxisIndex: 0,
        yAxisIndex: 0,
        barWidth: '80%',
        data: data.map((k) => [k.open, k.close, k.low, k.high]),
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
        data: data.map((k) => toNum(k.ma5)),
        symbol: 'none',
        lineStyle: { color: '#6366f1', width: 1 },
        itemStyle: { color: '#6366f1' },
        connectNulls: true,
      },
      {
        name: 'MA10',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: data.map((k) => toNum(k.ma10)),
        symbol: 'none',
        lineStyle: { color: '#f59e0b', width: 1 },
        itemStyle: { color: '#f59e0b' },
        connectNulls: true,
      },
      {
        name: 'MA20',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: data.map((k) => toNum(k.ma20)),
        symbol: 'none',
        lineStyle: { color: '#ec4899', width: 1 },
        itemStyle: { color: '#ec4899' },
        connectNulls: true,
      },
      {
        name: 'EMA12',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: data.map((k) => toNum(k.ema12)),
        symbol: 'none',
        lineStyle: { color: '#14b8a6', width: 1, type: 'dashed' },
        itemStyle: { color: '#14b8a6' },
        connectNulls: true,
      },
      {
        name: 'EMA26',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: data.map((k) => toNum(k.ema26)),
        symbol: 'none',
        lineStyle: { color: '#f97316', width: 1, type: 'dashed' },
        itemStyle: { color: '#f97316' },
        connectNulls: true,
      },
      {
        name: 'BOLL上',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: data.map((k) => toNum(k.bollUp)),
        symbol: 'none',
        lineStyle: { color: '#94a3b8', width: 1, type: 'dotted' },
        itemStyle: { color: '#94a3b8' },
        connectNulls: true,
      },
      {
        name: 'BOLL中',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: data.map((k) => toNum(k.bollMid)),
        symbol: 'none',
        lineStyle: { color: '#64748b', width: 1, type: 'dotted' },
        itemStyle: { color: '#64748b' },
        connectNulls: true,
      },
      {
        name: 'BOLL下',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: data.map((k) => toNum(k.bollDn)),
        symbol: 'none',
        lineStyle: { color: '#94a3b8', width: 1, type: 'dotted' },
        itemStyle: { color: '#94a3b8' },
        connectNulls: true,
      },
      {
        name: '通道上',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: data.map((k) => toNum(k.channelUp)),
        symbol: 'none',
        lineStyle: { color: '#e879f9', width: 1.5 },
        itemStyle: { color: '#e879f9' },
        connectNulls: true,
      },
      {
        name: '通道中',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: data.map((k) => toNum(k.channelMid)),
        symbol: 'none',
        lineStyle: { color: '#c084fc', width: 1, type: 'dashed' },
        itemStyle: { color: '#c084fc' },
        connectNulls: true,
      },
      {
        name: '通道下',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: data.map((k) => toNum(k.channelDn)),
        symbol: 'none',
        lineStyle: { color: '#e879f9', width: 1.5 },
        itemStyle: { color: '#e879f9' },
        connectNulls: true,
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        barWidth: '80%',
        data: data.map((k) => ({
          value: toNum(k.vol),
          itemStyle: {
            color: Number(k.close) >= Number(k.open) ? '#10b981' : '#ef4444',
            opacity: 0.7,
          },
        })),
      },
      {
        name: 'DIF',
        type: 'line',
        xAxisIndex: 2,
        yAxisIndex: 2,
        data: data.map((k) => toNum(k.dif)),
        symbol: 'none',
        lineStyle: { color: '#6366f1', width: 1 },
        itemStyle: { color: '#6366f1' },
        connectNulls: true,
      },
      {
        name: 'DEA',
        type: 'line',
        xAxisIndex: 2,
        yAxisIndex: 2,
        data: data.map((k) => toNum(k.dea)),
        symbol: 'none',
        lineStyle: { color: '#f59e0b', width: 1 },
        itemStyle: { color: '#f59e0b' },
        connectNulls: true,
      },
      {
        name: 'MACD',
        type: 'bar',
        xAxisIndex: 2,
        yAxisIndex: 2,
        barWidth: '80%',
        data: data.map((k) => {
          const v = toNum(k.macd)
          return { value: v, itemStyle: { color: v >= 0 ? '#10b981' : '#ef4444' } }
        }),
      },
      {
        name: 'K',
        type: 'line',
        xAxisIndex: 3,
        yAxisIndex: 3,
        data: data.map((k) => toNum(k.k)),
        symbol: 'none',
        lineStyle: { color: '#6366f1', width: 1 },
        itemStyle: { color: '#6366f1' },
        connectNulls: true,
      },
      {
        name: 'D',
        type: 'line',
        xAxisIndex: 3,
        yAxisIndex: 3,
        data: data.map((k) => toNum(k.d)),
        symbol: 'none',
        lineStyle: { color: '#f59e0b', width: 1 },
        itemStyle: { color: '#f59e0b' },
        connectNulls: true,
      },
      {
        name: 'J',
        type: 'line',
        xAxisIndex: 3,
        yAxisIndex: 3,
        data: data.map((k) => toNum(k.j)),
        symbol: 'none',
        lineStyle: { color: '#ef4444', width: 1 },
        itemStyle: { color: '#ef4444' },
        connectNulls: true,
      },
      {
        name: 'RSI6',
        type: 'line',
        xAxisIndex: 4,
        yAxisIndex: 4,
        data: data.map((k) => toNum(k.rsi6)),
        symbol: 'none',
        lineStyle: { color: '#6366f1', width: 1 },
        itemStyle: { color: '#6366f1' },
        connectNulls: true,
      },
      {
        name: 'RSI12',
        type: 'line',
        xAxisIndex: 4,
        yAxisIndex: 4,
        data: data.map((k) => toNum(k.rsi12)),
        symbol: 'none',
        lineStyle: { color: '#f59e0b', width: 1 },
        itemStyle: { color: '#f59e0b' },
        connectNulls: true,
      },
      {
        name: 'RSI24',
        type: 'line',
        xAxisIndex: 4,
        yAxisIndex: 4,
        data: data.map((k) => toNum(k.rsi24)),
        symbol: 'none',
        lineStyle: { color: '#10b981', width: 1 },
        itemStyle: { color: '#10b981' },
        connectNulls: true,
      },
      {
        name: '趋势线',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: trendLineData,
        symbol: 'none',
        lineStyle: { color: '#facc15', width: 1.5 },
        itemStyle: { color: '#facc15' },
        connectNulls: false,
      },
      {
        name: '趋势上轨',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: trendUpperData,
        symbol: 'none',
        lineStyle: { color: '#facc15', width: 1, type: 'dashed' },
        itemStyle: { color: '#facc15' },
        connectNulls: false,
      },
      {
        name: '趋势下轨',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: trendLowerData,
        symbol: 'none',
        lineStyle: { color: '#facc15', width: 1, type: 'dashed' },
        itemStyle: { color: '#facc15' },
        connectNulls: false,
      },
    ],
  }
})

async function fetchKline() {
  if (!selectedCoin.value) return
  isFetchingMore.value = false
  savedZoom = { start: 50, end: 100 }
  trendInfo.value = null
  const res = await getMarkPriceCandles({
    instId: selectedCoin.value,
    bar: selectedPeriod.value,
    limit: '100',
  })
  const list = Array.isArray(res) ? res : []
  const sorted = [...list].reverse()
  klineRaw.value = sorted.map(mapToRow)

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
      volume: Number(latest.vol).toLocaleString(),
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
  const dz = evt?.batch?.[0] ?? evt
  if (!dz) return

  savedZoom.start = dz.start ?? 50
  savedZoom.end = dz.end ?? 100

  if (isFetchingMore.value || !klineRaw.value.length) return
  // 仅当缩放百分比 < 3% 时才认为触达左侧边缘，避免普通拖拽误触
  if ((dz.start ?? 50) > 3) return
  // 冷却 3 秒，防止连续触发
  const now = Date.now()
  if (now - lastFetchMoreTime < 3000) return

  const startValue = dz.startValue ?? 0
  const endValue = dz.endValue ?? klineRaw.value.length - 1

  const chart = chartRef.value?.chart
  if (!chart) return

  isFetchingMore.value = true
  lastFetchMoreTime = now
  try {
    const earliestTs = klineRaw.value[0].ts
    const res = await getMarkPriceCandles({
      instId: selectedCoin.value,
      bar: selectedPeriod.value,
      limit: '100',
      after: earliestTs,
    })
    const list = Array.isArray(res) ? res : []
    if (!list.length) return
    const sorted = [...list].reverse()
    const newRows = sorted.map(mapToRow)
    // 预计算新的缩放百分比，避免 shallowRef 赋值触发 computed 重渲染时跳到错误的位置
    const oldLen = klineRaw.value.length
    const newLen = newRows.length + oldLen
    const shift = (newRows.length / newLen) * 100
    savedZoom = {
      start: shift + (savedZoom.start / 100) * (oldLen / newLen) * 100,
      end: shift + (savedZoom.end / 100) * (oldLen / newLen) * 100,
    }
    klineRaw.value = [...newRows, ...klineRaw.value]
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
  if (msg.trend) {
    trendInfo.value = msg.trend
  }
  if (!klineRaw.value.length) return

  const lastRow = klineRaw.value[klineRaw.value.length - 1]

  if (lastRow.ts === item.ts) {
    // 同一根 K 线更新：保留 REST 提供的指标值
    const updatedRow = {
      ...lastRow,
      date: fmtTs(item.ts),
      ts: item.ts,
      open: item.open,
      close: item.close,
      low: item.low,
      high: item.high,
      vol: item.vol,
      trendType: item.trendType ?? lastRow.trendType,
    }
    // 直接就地修改，不重新赋值 shallowRef，避免触发 computed 重渲染
    klineRaw.value[klineRaw.value.length - 1] = updatedRow
  } else {
    // 新 K 线：指标值设为 null（WS 不含指标数据，不应沿用上一根的值）
    const newRow = {
      date: fmtTs(item.ts),
      ts: item.ts,
      open: item.open,
      close: item.close,
      low: item.low,
      high: item.high,
      vol: item.vol,
      ma5: null,
      ma10: null,
      ma20: null,
      ema12: null,
      ema26: null,
      dif: null,
      dea: null,
      macd: null,
      channelUp: null,
      channelMid: null,
      channelDn: null,
      bollUp: null,
      bollMid: null,
      bollDn: null,
      k: null,
      d: null,
      j: null,
      rsi6: null,
      rsi12: null,
      rsi24: null,
      trendType: item.trendType ?? null,
    }
    klineRaw.value.push(newRow)
  }

  // 直接增量更新 ECharts，不触发 computed 重算（保留 dataZoom 状态）
  const chart = chartRef.value?.chart
  if (chart) {
    const data = klineRaw.value
    const dates = data.map((k) => k.date)
    const [_tl, _tu, _tld] = computeTrendSeriesData(data)
    chart.setOption({
      xAxis: [{ data: dates }, { data: dates }, { data: dates }, { data: dates }, { data: dates }],
      series: [
        { data: data.map((k) => [k.open, k.close, k.low, k.high]) },
        { data: data.map((k) => toNum(k.ma5)) },
        { data: data.map((k) => toNum(k.ma10)) },
        { data: data.map((k) => toNum(k.ma20)) },
        { data: data.map((k) => toNum(k.ema12)) },
        { data: data.map((k) => toNum(k.ema26)) },
        { data: data.map((k) => toNum(k.bollUp)) },
        { data: data.map((k) => toNum(k.bollMid)) },
        { data: data.map((k) => toNum(k.bollDn)) },
        { data: data.map((k) => toNum(k.channelUp)) },
        { data: data.map((k) => toNum(k.channelMid)) },
        { data: data.map((k) => toNum(k.channelDn)) },
        {
          data: data.map((k) => ({
            value: toNum(k.vol),
            itemStyle: {
              color: Number(k.close) >= Number(k.open) ? '#10b981' : '#ef4444',
              opacity: 0.7,
            },
          })),
        },
        { data: data.map((k) => toNum(k.dif)) },
        { data: data.map((k) => toNum(k.dea)) },
        {
          data: data.map((k) => {
            const v = toNum(k.macd)
            return { value: v, itemStyle: { color: v >= 0 ? '#10b981' : '#ef4444' } }
          }),
        },
        { data: data.map((k) => toNum(k.k)) },
        { data: data.map((k) => toNum(k.d)) },
        { data: data.map((k) => toNum(k.j)) },
        { data: data.map((k) => toNum(k.rsi6)) },
        { data: data.map((k) => toNum(k.rsi12)) },
        { data: data.map((k) => toNum(k.rsi24)) },
        { data: _tl },
        { data: _tu },
        { data: _tld },
      ],
    })
  }

  // 更新统计卡片
  stats.value.price = Number(item.close).toFixed(2)
  stats.value.volume = Number(item.vol).toLocaleString()
  if (msg.trend?.trendType) stats.value.trendType = msg.trend.trendType
  else if (item.trendType) stats.value.trendType = item.trendType
  const firstClose = Number(klineRaw.value[0].close)
  if (firstClose) {
    const changeVal = (((Number(item.close) - firstClose) / firstClose) * 100).toFixed(2)
    stats.value.change = `${Number(changeVal) >= 0 ? '+' : ''}${changeVal}%`
    stats.value.up = Number(changeVal) >= 0
  }
  stats.value.high = Math.max(...klineRaw.value.map((k) => Number(k.high))).toFixed(2)
  stats.value.low = Math.min(...klineRaw.value.map((k) => Number(k.low))).toFixed(2)
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
  <div class="analysis-page">
    <!-- 顶部工具栏：产品下拉 + 周期 + 行情摘要 -->
    <div class="toolbar">
      <el-select
        v-model="selectedCoin"
        placeholder="选择产品"
        size="small"
        filterable
        style="width: 180px"
      >
        <el-option v-for="c in coins" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>

      <el-radio-group v-model="selectedPeriod" size="small" class="period-group">
        <el-radio-button v-for="p in periods" :key="p" :value="p">{{ p }}</el-radio-button>
      </el-radio-group>

      <span class="stat-item">
        <span class="stat-label">最新</span>
        <span :class="stats.up ? 'text-green-600' : 'text-red-500'" class="stat-val">{{
          stats.price
        }}</span>
        <el-tag :type="stats.up ? 'success' : 'danger'" size="small" class="ml-1">{{
          stats.change
        }}</el-tag>
      </span>
      <span class="stat-item">
        <span class="stat-label">高</span>
        <span class="text-green-600 stat-val">{{ stats.high }}</span>
      </span>
      <span class="stat-item">
        <span class="stat-label">低</span>
        <span class="text-red-500 stat-val">{{ stats.low }}</span>
      </span>
      <span class="stat-item">
        <span class="stat-label">量</span>
        <span class="stat-val">{{ stats.volume }}</span>
      </span>
      <span class="stat-item">
        <span class="stat-label">趋势</span>
        <el-tag
          :type="
            stats.trendType === 'UPTREND'
              ? 'success'
              : stats.trendType === 'DOWNTREND'
                ? 'danger'
                : 'warning'
          "
          size="small"
          >{{ stats.trendType }}</el-tag
        >
      </span>
    </div>

    <!-- K线图 -->
    <div class="chart-wrap">
      <v-chart
        ref="chartRef"
        :option="klineOption"
        class="chart-full"
        autoresize
        @datazoom="handleDataZoom"
        @legendselectchanged="handleLegendChanged"
      />
    </div>
  </div>
</template>

<style scoped>
.analysis-page {
  display: flex;
  flex-direction: column;
  /* 减去 TopNav + content padding 的高度 */
  height: calc(100vh - 110px);
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.period-group :deep(.el-radio-button__inner) {
  padding: 4px 10px;
  font-size: 12px;
}
.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}
.stat-label {
  color: #9ca3af;
  font-size: 12px;
}
.stat-val {
  font-weight: 600;
}
.chart-wrap {
  flex: 1;
  min-height: 0;
  padding: 4px;
}
.chart-full {
  width: 100%;
  height: 100%;
}
</style>
