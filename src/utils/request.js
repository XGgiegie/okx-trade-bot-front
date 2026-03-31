import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── 请求拦截器 ─────────────────────────────────────────
service.interceptors.request.use(
  (config) => {
    // 如需 token 鉴权，在此处注入
    // const token = localStorage.getItem('token')
    // if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// ─── 响应拦截器 ─────────────────────────────────────────
service.interceptors.response.use(
  (response) => {
    const res = response.data

    // 约定后端返回结构: { code: number, data: any, message: string }
    // code 为 200 视为成功，直接返回 data
    if (res.code === undefined) {
      // 后端直接返回数据（无 code 包装），直接透传
      return res
    }

    if (res.code === "0") {
      return res.data
    }

    // 业务错误统一提示
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    const status = error.response?.status
    const messages = {
      400: '请求参数错误',
      401: '未授权，请重新登录',
      403: '拒绝访问',
      404: '请求地址不存在',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务不可用',
    }
    const msg = messages[status] || error.message || '网络异常'
    ElMessage.error(msg)
    return Promise.reject(error)
  },
)

// ─── 封装常用方法 ────────────────────────────────────────

/**
 * GET 请求
 * @param {string} url
 * @param {object} params - query 参数
 * @param {object} config - 额外 axios 配置
 */
export function get(url, params = {}, config = {}) {
  return service.get(url, { params, ...config })
}

/**
 * POST 请求
 * @param {string} url
 * @param {object} data - body 参数
 * @param {object} config - 额外 axios 配置
 */
export function post(url, data = {}, config = {}) {
  return service.post(url, data, config)
}

/**
 * PUT 请求
 */
export function put(url, data = {}, config = {}) {
  return service.put(url, data, config)
}

/**
 * DELETE 请求
 */
export function del(url, params = {}, config = {}) {
  return service.delete(url, { params, ...config })
}

/**
 * 文件上传（multipart/form-data）
 */
export function upload(url, formData, config = {}) {
  return service.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  })
}

export default service
