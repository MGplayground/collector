import { describe, expect, it } from 'vitest'
import {
  canBump, canPublish, canTransition, daysUntilBump, dueForBump,
  isDueForBump, nextBumpAt, photoOverflow, publishBlockers,
} from './state'

const listing = (over = {}) => ({
  state: 'draft', title: 'Vintage Carhartt jacket', description: 'Lovely.',
  price: 45, listed_at: null, last_bumped_at: null, bump_days: 3, ...over,
})
const photo = () => ({ id: crypto.randomUUID(), storage_path: 'x.jpg' })
const days = n => new Date(Date.now() + n * 86400000)

describe('transitions', () => {
  it('allows the real lifecycle', () => {
    expect(canTransition('draft', 'listed')).toBe(true)
    expect(canTransition('listed', 'sold')).toBe(true)
    expect(canTransition('listed', 'delisted')).toBe(true)
    expect(canTransition('delisted', 'listed')).toBe(true)
  })

  it('treats sold as terminal', () => {
    expect(canTransition('sold', 'listed')).toBe(false)
    expect(canTransition('sold', 'delisted')).toBe(false)
  })

  it('refuses to skip publishing', () => {
    expect(canTransition('draft', 'sold')).toBe(false)
  })
})

describe('publishing', () => {
  it('needs a photo, title, description and price', () => {
    expect(publishBlockers(listing(), [photo()])).toEqual([])
    expect(canPublish(listing(), [photo()])).toBe(true)
  })

  it('names every missing piece rather than just failing', () => {
    const blockers = publishBlockers({ state: 'draft' }, [])
    expect(blockers).toHaveLength(4)
    expect(blockers.join(' ')).toMatch(/photo/)
    expect(blockers.join(' ')).toMatch(/price/)
  })

  it('rejects a zero or negative price', () => {
    expect(canPublish(listing({ price: 0 }), [photo()])).toBe(false)
    expect(canPublish(listing({ price: -5 }), [photo()])).toBe(false)
  })

  it('will not republish something already live', () => {
    expect(canPublish(listing({ state: 'listed' }), [photo()])).toBe(false)
  })

  it('allows a delisted listing to be relisted', () => {
    expect(canPublish(listing({ state: 'delisted' }), [photo()])).toBe(true)
  })
})

describe('bumping', () => {
  it('only bumps live listings', () => {
    expect(canBump(listing({ state: 'listed' }))).toBe(true)
    for (const state of ['draft', 'sold', 'delisted']) {
      expect(canBump(listing({ state }))).toBe(false)
    }
  })

  // The whole point of the module: a sold item must never resurface.
  it('never schedules a bump for a sold listing', () => {
    const sold = listing({ state: 'sold', listed_at: days(-30).toISOString() })
    expect(nextBumpAt(sold)).toBeNull()
    expect(isDueForBump(sold)).toBe(false)
    expect(dueForBump([sold])).toEqual([])
  })

  it('counts from the last bump, falling back to when it went live', () => {
    const fresh = listing({ state: 'listed', listed_at: days(-1).toISOString() })
    expect(isDueForBump(fresh)).toBe(false)

    const stale = listing({ state: 'listed', listed_at: days(-5).toISOString() })
    expect(isDueForBump(stale)).toBe(true)

    const bumped = listing({
      state: 'listed', listed_at: days(-10).toISOString(),
      last_bumped_at: days(-1).toISOString(),
    })
    expect(isDueForBump(bumped)).toBe(false)
  })

  it('honours a per-item bump interval', () => {
    const weekly = listing({ state: 'listed', listed_at: days(-5).toISOString(), bump_days: 7 })
    expect(isDueForBump(weekly)).toBe(false)

    const daily = listing({ state: 'listed', listed_at: days(-2).toISOString(), bump_days: 1 })
    expect(isDueForBump(daily)).toBe(true)
  })

  it('orders the worklist most overdue first', () => {
    const a = listing({ id: 'a', state: 'listed', listed_at: days(-4).toISOString() })
    const b = listing({ id: 'b', state: 'listed', listed_at: days(-20).toISOString() })
    expect(dueForBump([a, b]).map(l => l.id)).toEqual(['b', 'a'])
  })

  it('reports days until due, negative when overdue', () => {
    expect(daysUntilBump(listing({ state: 'listed', listed_at: days(-1).toISOString() }))).toBe(2)
    expect(daysUntilBump(listing({ state: 'listed', listed_at: days(-10).toISOString() }))).toBe(-7)
    expect(daysUntilBump(listing({ state: 'draft' }))).toBeNull()
  })
})

describe('photo overflow', () => {
  it('reports how many will not fit Depop', () => {
    expect(photoOverflow([photo(), photo()])).toBe(0)
    expect(photoOverflow(Array.from({ length: 6 }, photo))).toBe(2)
  })
})
