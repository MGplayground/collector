import { getItems } from './items'
import { getAllPriceHistory } from './priceHistory'

export async function getAnalyticsData() {
  const [items, allHistory] = await Promise.all([
    getItems(),
    getAllPriceHistory(),
  ])

  const owned = items.filter(i => i.status !== 'sold')
  const totalValue    = owned.reduce((s, i) => s + (Number(i.current_value) || 0), 0)
  const totalInvested = owned.reduce((s, i) => s + (Number(i.purchase_price) || 0), 0)
  const totalGain     = totalValue - totalInvested

  // Realized gains from sold items
  const sold = items.filter(i => i.status === 'sold')
  const realizedGain = sold.reduce((s, i) => {
    const g = (Number(i.sale_price) || 0) - (Number(i.purchase_price) || 0)
    return s + g
  }, 0)

  // Category breakdown (owned + watchlist)
  const byCategory = {}
  owned.forEach(i => {
    byCategory[i.category] = (byCategory[i.category] || 0) + (Number(i.current_value) || 0)
  })

  // Gainers/losers (items with both purchase_price and current_value)
  const withGain = items
    .filter(i => i.purchase_price && i.current_value && i.status !== 'sold')
    .map(i => ({
      ...i,
      gainPct: ((i.current_value - i.purchase_price) / i.purchase_price) * 100
    }))
    .sort((a, b) => b.gainPct - a.gainPct)

  // Most valuable — top 3 non-sold items by current_value
  const mostValuable = owned
    .filter(i => i.current_value)
    .sort((a, b) => Number(b.current_value) - Number(a.current_value))
    .slice(0, 3)
    .map(i => ({ id: i.id, name: i.name, current_value: Number(i.current_value) }))

  // Trending — top 3 items by absolute price move in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  const trending = items
    .map(item => {
      const itemHistory = allHistory
        .filter(h => h.item_id === item.id)
        .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))

      const recentEntries = itemHistory.filter(h => h.recorded_at >= cutoff)
      if (!recentEntries.length) return null

      // Start price: earliest in-window entry, or most recent pre-window entry
      const preWindow = itemHistory.filter(h => h.recorded_at < cutoff)
      const startEntry = recentEntries.length >= 2
        ? recentEntries[0]
        : (preWindow.length ? preWindow[preWindow.length - 1] : recentEntries[0])

      const endEntry = recentEntries[recentEntries.length - 1]
      if (startEntry === endEntry) return null  // only one data point total

      const startPrice = Number(startEntry.price)
      const endPrice   = Number(endEntry.price)
      const recentMove = endPrice - startPrice
      const recentMovePct = startPrice ? (recentMove / startPrice) * 100 : 0

      return { id: item.id, name: item.name, recentMove, recentMovePct }
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.recentMove) - Math.abs(a.recentMove))
    .slice(0, 3)

  // Aggregate portfolio value over time from price_history
  const portfolioTimeline = buildPortfolioTimeline(items, allHistory)

  return { totalValue, totalInvested, totalGain, realizedGain, byCategory, withGain, portfolioTimeline, mostValuable, trending }
}

function buildPortfolioTimeline(items, history) {
  if (!history.length) return []

  // Get all unique dates (to the day) from history
  const dates = [...new Set(history.map(h => h.recorded_at.slice(0, 10)))].sort()

  return dates.map(date => {
    // For each item, find the latest price_history entry on or before this date
    let total = 0
    items.forEach(item => {
      const entries = history
        .filter(h => h.item_id === item.id && h.recorded_at.slice(0, 10) <= date)
        .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
      if (entries.length) {
        total += Number(entries[entries.length - 1].price)
      } else if (item.current_value) {
        // Item existed but had no history before this date — use current value as fallback
        // (only if item was created before or on this date)
        if (item.created_at && item.created_at.slice(0, 10) <= date) {
          total += Number(item.current_value)
        }
      }
    })
    return { date, total }
  })
}
