import { get } from '@/utils/request'

/**
 * 获取标记价格 K 线数据
 * 对应后端接口: GET /api/v1/kline/mark-price-candles
 *
 * @param {object} params
 * @param {string} params.instId - 产品 ID，例如 BTC-USD-SWAP
 * @param {string} [params.after] - 请求此时间戳之前的历史数据
 * @param {string} [params.before] - 请求此时间戳之后的数据
 * @param {string} [params.bar] - 时间粒度，例如 15m、1H、4H、1D、1W
 * @param {string|number} [params.limit] - 返回条数，最大 100
 */
export function getMarkPriceCandles(params) {
  return get('/kline/mark-price-candles', params)
}
