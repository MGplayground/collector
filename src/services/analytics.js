import { getItems } from './items'
import { getAllPriceHistory } from './priceHistory'
import { held, heldOn, isSold, isWatchlist, sumBy, watched } from '../domain/portfolio'

export async function getAnalyticsData() {
  const [items, allHistory] = await Promise.all([
    getItems(),
    getAllPriceHistory(),
  ])
  return computeAnalytics(items, allHistory)
}

/** Pure, so it can be tested without a database. */
export function computeAnalytics(items, allHistory) {
  // Portfolio figures cover owned items only. A watchlist item is something you
  // do not own, so it can contribute neither value nor cost basis.
  const owned = held(items)
  const totalValue    = sumBy(owned, 'current_value')
  const totalInvested = sumBy(owned, 'purchase_price')
  const totalGain     = totalValue - totalInvested

  const sold = items.filter(isSold)
  const realizedGain = sold.reduce(
    (sum, i) => sum + ((Number(i.sale_price) || 0) - (Number(i.purchase_price) || 0)), 0)

  // Reported separately so tracked value stays visible without inflating the portfolio.
  const watchlist = watched(items)
  const watchlistValue = sumBy(watchlist, 'current_value')

  const byCategory = {}
  owned.forEach(i => {
    byCategory[i.category] = (byCategory[i.category] || 0) + (Number(i.current_value) || 0)
  })

  const withGain = owned
    .filter(i => i.purchase_price && i.current_value)
    .map(i => ({ ...i, gainPct: ((i.current_value - i.purchase_price) / i.purchase_price) * 100 }))
    .sort((a, b) => b.gainPct - a.gainPct)

  const mostValuable = owned
    .filter(i => i.current_value)
    .sort((a, b) => Number(b.current_value) - Number(a.current_value))
    .slice(0, 3)
    .map(i => ({ id: i.id, name: i.name, current_value: Number(i.current_value) }))

  // Trending covers watchlist items too: it reports price movement, not ownership,
  // and tracking movement is the whole point of a watchlist.
  const trending = buildTrending(items.filter(i => !isSold(i)), allHistory)

  return {
    totalValue, totalInvested, totalGain, realizedGain,
    heldCount: owned.length,
    watchlistValue, watchlistCount: watchlist.length,
    byCategory, withGain,
    portfolioTimeline: buildPortfolioTimeline(items, allHistory),
    mostValuable, trending,
  }
}

function buildTrending(candidates, allHistory) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString()

  return candidates
    .map(item => {
      const itemHistory = allHistory
        .filter(h => h.item_id === item.id)
        .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))

      const recentEntries = itemHistory.filter(h => h.recorded_at >= cutoff)
      if (!recentEntries.length) return null

      // Start price: earliest in-window entry, or the most recent one before the window.
      const preWindow = itemHistory.filter(h => h.recorded_at < cutoff)
      const startEntry = recentEntries.length >= 2
        ? recentEntries[0]
        : (preWindow.length ? preWindow[preWindow.length - 1] : recentEntries[0])

      const endEntry = recentEntries[recentEntries.length - 1]
      if (startEntry === endEntry) return null   // only one data point total

      const startPrice = Number(startEntry.price)
      const endPrice   = Number(endEntry.price)
      const recentMove = endPrice - startPrice

      return {
        id: item.id,
        name: item.name,
        recentMove,
        recentMovePct: startPrice ? (recentMove / startPrice) * 100 : 0,
        isWatchlist: isWatchlist(item),
      }
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.recentMove) - Math.abs(a.recentMove))
    .slice(0, 3)
}

function buildPortfolioTimeline(items, history) {
  if (!history.length) return []

  const dates = [...new Set(history.map(h => h.recorded_at.slice(0, 10)))].sort()

  // Index history per item once rather than re-filtering the whole log per date.
  const byItem = new Map()
  history.forEach(h => {
    if (!byItem.has(h.item_id)) byItem.set(h.item_id, [])
    byItem.get(h.item_id).push(h)
  })
  byItem.forEach(entries => entries.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)))

  return dates.map(date => {
    let total = 0
    items.forEach(item => {
      // Only items actually held on this day contribute, so a sale removes an
      // item from the line instead of leaving it in the portfolio forever.
      if (!heldOn(item, date)) return

      const entries = (byItem.get(item.id) ?? []).filter(h => h.recorded_at.slice(0, 10) <= date)
      if (entries.length) {
        total += Number(entries[entries.length - 1].price)
      } else if (item.current_value) {
        total += Number(item.current_value)
      }
    })
    return { date, total }
  })
}
