import { getItems } from './items'
import { getAllPriceHistory } from './priceHistory'
import { computeAnalytics } from '../domain/analytics'

export async function getAnalyticsData() {
  const [items, allHistory] = await Promise.all([
    getItems(),
    getAllPriceHistory(),
  ])
  return computeAnalytics(items, allHistory)
}
