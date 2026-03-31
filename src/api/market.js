import { get } from '@/utils/request'

/**
 * 获取行情列表
 * @param {object} params - { symbol, period }
 */
export function getMarketList(params) {
  return get('/api/v1/kline', params)
}

