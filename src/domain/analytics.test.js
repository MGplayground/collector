import { describe, expect, it } from 'vitest'
import { computeAnalytics } from '../domain/analytics'

const item = (over = {}) => ({
  id: crypto.randomUUID(),
  name: 'Card',
  category: 'pokemon',
  status: 'owned',
  item_type: 'card',
  is_raw: false,
  purchase_price: null,
  purchase_date: null,
  current_value: null,
  sale_price: null,
  sale_date: null,
  created_at: '2026-01-01T00:00:00Z',
  ...over,
})

describe('portfolio totals', () => {
  it('excludes watchlist items from value and cost basis', () => {
    const a = computeAnalytics([
      item({ status: 'owned',     purchase_price: 100, current_value: 150 }),
      item({ status: 'watchlist', purchase_price: 999, current_value: 800 }),
    ], [])

    expect(a.totalValue).toBe(150)
    expect(a.totalInvested).toBe(100)
    expect(a.totalGain).toBe(50)
    expect(a.heldCount).toBe(1)
  })

  it('reports watchlist value separately instead of hiding it', () => {
    const a = computeAnalytics([
      item({ status: 'watchlist', current_value: 800 }),
      item({ status: 'watchlist', current_value: 200 }),
    ], [])

    expect(a.watchlistValue).toBe(1000)
    expect(a.watchlistCount).toBe(2)
  })

  // Regression: the live database was entirely watchlist with no purchase prices,
  // and the app reported it as a £2,148.59 portfolio at £0 cost basis.
  it('reports an empty portfolio when everything is on the watchlist', () => {
    const a = computeAnalytics([
      item({ status: 'watchlist', current_value: 1050 }),
      item({ status: 'watchlist', current_value: 278.64 }),
      item({ status: 'watchlist', current_value: 250 }),
      item({ status: 'watchlist', current_value: 450 }),
      item({ status: 'watchlist', current_value: 119.95 }),
    ], [])

    expect(a.heldCount).toBe(0)
    expect(a.totalValue).toBe(0)
    expect(a.totalInvested).toBe(0)
    expect(a.totalGain).toBe(0)
    expect(a.watchlistValue).toBeCloseTo(2148.59, 2)
  })

  it('excludes sold items from value but counts them as realized gain', () => {
    const a = computeAnalytics([
      item({ status: 'owned', purchase_price: 100, current_value: 150 }),
      item({ status: 'sold',  purchase_price: 200, sale_price: 260, current_value: 260 }),
    ], [])

    expect(a.totalValue).toBe(150)
    expect(a.realizedGain).toBe(60)
  })

  it('keeps category breakdown and gainers to owned items only', () => {
    const a = computeAnalytics([
      item({ status: 'owned',     category: 'pokemon',   purchase_price: 100, current_value: 150 }),
      item({ status: 'watchlist', category: 'riftbound', purchase_price: 50,  current_value: 80 }),
    ], [])

    expect(a.byCategory).toEqual({ pokemon: 150 })
    expect(a.withGain).toHaveLength(1)
    expect(a.mostValuable).toHaveLength(1)
  })
})

describe('portfolio timeline', () => {
  const history = (item_id, recorded_at, price) => ({ id: crypto.randomUUID(), item_id, recorded_at, price })

  it('drops a sold item from the line after its sale date', () => {
    const sold = item({
      id: 'sold-1', status: 'sold',
      purchase_date: '2026-01-01', sale_date: '2026-03-01',
      purchase_price: 100, sale_price: 300, current_value: 300,
    })

    const a = computeAnalytics([sold], [
      history('sold-1', '2026-02-01T00:00:00Z', 200),
      history('sold-1', '2026-04-01T00:00:00Z', 500),
    ])

    const byDate = Object.fromEntries(a.portfolioTimeline.map(p => [p.date, p.total]))
    expect(byDate['2026-02-01']).toBe(200)   // still held
    expect(byDate['2026-04-01']).toBe(0)     // sold in March, must not contribute
  })

  it('never counts a watchlist item toward the timeline', () => {
    const a = computeAnalytics(
      [item({ id: 'w-1', status: 'watchlist', current_value: 800 })],
      [history('w-1', '2026-02-01T00:00:00Z', 800)],
    )

    expect(a.portfolioTimeline).toEqual([{ date: '2026-02-01', total: 0 }])
  })

  it('does not count an item before it was acquired', () => {
    const a = computeAnalytics(
      [item({ id: 'o-1', status: 'owned', purchase_date: '2026-03-01', current_value: 100 })],
      [history('other', '2026-01-01T00:00:00Z', 50), history('o-1', '2026-03-05T00:00:00Z', 100)],
    )

    const byDate = Object.fromEntries(a.portfolioTimeline.map(p => [p.date, p.total]))
    expect(byDate['2026-01-01']).toBe(0)
    expect(byDate['2026-03-05']).toBe(100)
  })
})
