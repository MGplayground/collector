import { describe, expect, it } from 'vitest'
import { marginPct, netProfit, summarise } from './profit'

const item = (over = {}) => ({ id: 'i1', cost: 20, state: 'listed', ...over })
const listing = (over = {}) => ({ id: 'l1', item_id: 'i1', state: 'listed', ...over })

describe('netProfit', () => {
  it('is null until the item actually sells', () => {
    expect(netProfit(listing(), item())).toBeNull()
  })

  it('subtracts cost, platform fee and shipping from the sale price', () => {
    const sold = listing({ state: 'sold', sold_price: 60, platform_fee: 6, shipping_cost: 4 })
    expect(netProfit(sold, item({ cost: 20 }))).toBe(30)
  })

  it('treats missing fees and shipping as zero, not as unknown', () => {
    expect(netProfit(listing({ state: 'sold', sold_price: 50 }), item({ cost: 20 }))).toBe(30)
  })

  it('handles PostgREST numeric strings', () => {
    const sold = listing({ state: 'sold', sold_price: '60.50', platform_fee: '6.05' })
    expect(netProfit(sold, item({ cost: '20.00' }))).toBeCloseTo(34.45, 2)
  })

  it('goes negative on a loss', () => {
    const sold = listing({ state: 'sold', sold_price: 10, platform_fee: 1 })
    expect(netProfit(sold, item({ cost: 20 }))).toBe(-11)
  })
})

describe('marginPct', () => {
  it('is profit over cost', () => {
    const sold = listing({ state: 'sold', sold_price: 60, platform_fee: 6, shipping_cost: 4 })
    expect(marginPct(sold, item({ cost: 20 }))).toBe(150)
  })

  it('is null when nothing was paid, since that is not a percentage', () => {
    expect(marginPct(listing({ state: 'sold', sold_price: 60 }), item({ cost: 0 }))).toBeNull()
    expect(marginPct(listing({ state: 'sold', sold_price: 60 }), item({ cost: null }))).toBeNull()
  })
})

describe('summarise', () => {
  const items = [
    item({ id: 'a', cost: 20, state: 'listed' }),
    item({ id: 'b', cost: 30, state: 'draft' }),
    item({ id: 'c', cost: 15, state: 'sold' }),
    item({ id: 'd', cost: 99, state: 'archived' }),
  ]
  const listings = [
    listing({ id: 'l1', item_id: 'a', state: 'listed' }),
    listing({ id: 'l2', item_id: 'c', state: 'sold', sold_price: 40, platform_fee: 4 }),
    listing({ id: 'l3', item_id: 'b', state: 'draft' }),
  ]

  it('values unsold stock at cost, never at asking price', () => {
    const s = summarise({ items, listings })
    expect(s.stockCount).toBe(2)      // listed + draft; sold and archived excluded
    expect(s.stockAtCost).toBe(50)    // 20 + 30
  })

  it('counts live and sold listings separately', () => {
    const s = summarise({ items, listings })
    expect(s.liveCount).toBe(1)
    expect(s.soldCount).toBe(1)
  })

  it('reports realised profit net of fees', () => {
    const s = summarise({ items, listings })
    expect(s.soldRevenue).toBe(40)
    expect(s.realisedProfit).toBe(21)   // 40 − 15 cost − 4 fee
  })

  it('copes with nothing at all', () => {
    expect(summarise()).toMatchObject({ stockCount: 0, stockAtCost: 0, realisedProfit: 0 })
  })
})
