import { describe, expect, it } from 'vitest'
import { heldOn, held, watched, sumBy } from './portfolio'

const item = (over = {}) => ({
  status: 'owned', purchase_date: null, sale_date: null,
  created_at: '2026-01-01T00:00:00Z', ...over,
})

describe('heldOn', () => {
  it('is false for watchlist items on any date', () => {
    expect(heldOn(item({ status: 'watchlist' }), '2026-06-01')).toBe(false)
  })

  it('is false before the purchase date and true after', () => {
    const it_ = item({ purchase_date: '2026-03-01' })
    expect(heldOn(it_, '2026-02-28')).toBe(false)
    expect(heldOn(it_, '2026-03-01')).toBe(true)
  })

  it('stops on the sale date', () => {
    const it_ = item({ status: 'sold', purchase_date: '2026-01-01', sale_date: '2026-05-01' })
    expect(heldOn(it_, '2026-04-30')).toBe(true)
    expect(heldOn(it_, '2026-05-01')).toBe(false)
  })

  it('treats a sold item with no sale date as no longer held', () => {
    expect(heldOn(item({ status: 'sold' }), '2026-06-01')).toBe(false)
  })

  it('falls back to created_at when there is no purchase date', () => {
    const it_ = item({ created_at: '2026-04-10T12:00:00Z' })
    expect(heldOn(it_, '2026-04-09')).toBe(false)
    expect(heldOn(it_, '2026-04-10')).toBe(true)
  })
})

describe('populations', () => {
  const items = [
    item({ status: 'owned' }), item({ status: 'watchlist' }), item({ status: 'sold' }),
  ]

  it('separates held from watched', () => {
    expect(held(items)).toHaveLength(1)
    expect(watched(items)).toHaveLength(1)
  })
})

describe('sumBy', () => {
  it('treats null and undefined as zero', () => {
    expect(sumBy([{ v: 10 }, { v: null }, {}], 'v')).toBe(10)
  })

  it('coerces numeric strings, as PostgREST returns for numeric columns', () => {
    expect(sumBy([{ v: '10.50' }, { v: '4.50' }], 'v')).toBe(15)
  })
})
