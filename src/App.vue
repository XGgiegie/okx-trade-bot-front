<script setup>
import { RouterView } from 'vue-router'
import { onMounted, onUnmounted, provide } from 'vue'

let ws = null
let reconnectTimer = null
const messageHandlers = new Set()

function getWsUrl() {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  return base.replace(/^http/, 'ws') + '/okx'
}

function connect() {
  ws = new WebSocket(getWsUrl())

  ws.onopen = () => {
    console.log('[WS] 已连接:', getWsUrl())
    clearTimeout(reconnectTimer)
  }

  ws.onmessage = (event) => {
    console.log('[WS] 收到消息:', event.data)
    messageHandlers.forEach((fn) => {
      try {
        fn(event.data)
      } catch (e) {
        console.error('[WS] handler error:', e)
      }
    })
  }

  ws.onerror = (err) => {
    console.warn('[WS] 连接错误', err)
  }

  ws.onclose = () => {
    console.log('[WS] 连接断开，5s 后重连...')
    reconnectTimer = setTimeout(connect, 5000)
  }
}

// 向子组件提供消息监听注册/注销
provide('wsOn', (fn) => messageHandlers.add(fn))
provide('wsOff', (fn) => messageHandlers.delete(fn))

// 向子组件提供 send 方法
provide('wsSend', (msg) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('[WS] 发送消息:', msg)
    ws.send(msg)
  } else {
    console.warn('[WS] 未连接，无法发送:', msg)
  }
})

onMounted(() => {
  connect()
})

onUnmounted(() => {
  clearTimeout(reconnectTimer)
  ws?.close()
})
</script>

<template>
  <RouterView />
</template>
