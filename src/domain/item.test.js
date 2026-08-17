import { describe, expect, it } from 'vitest'
import {
  CATEGORIES, CATEGORY_LABELS, ITEM_TYPES, ITEM_TYPE_LABELS, STATUSES, STATUS_LABELS,
  categoryLabel, gradeLabel, isSealed, isSlabbed, itemTypeLabel, statusLabel,
} from './item'

const item = (over = {}) => ({
  item_type: 'card', is_raw: false, grade_company: 'PSA', grade: '9', ...over,
})

/**
 * These arrays are the client-side mirror of the CHECK constraints in
 * supabase/migrations/. If a migration changes one, this is where it fails first.
 */
describe('enum values match the database CHECK constraints', () => {
  it('status', () => {
    expect(STATUSES).toEqual(['owned', 'watchlist', 'sold'])
  })

  it('category', () => {
    expect(CATEGORIES).toEqual(['pokemon', 'yugioh', 'dragonball', 'riftbound', 'other'])
  })

  it('item_type', () => {
    expect(ITEM_TYPES).toEqual(['card', 'booster_pack', 'booster_box', 'sealed_other'])
  })
})

describe('every enum value has a label', () => {
  it.each([
    ['status', STATUSES, STATUS_LABELS, statusLabel],
    ['category', CATEGORIES, CATEGORY_LABELS, categoryLabel],
    ['item_type', ITEM_TYPES, ITEM_TYPE_LABELS, itemTypeLabel],
  ])('%s', (_name, values, labels, label) => {
    expect(Object.keys(labels).sort()).toEqual([...values].sort())
    for (const value of values) {
      // A label that is still the raw token would leak snake_case into the UI.
      expect(label(value)).toBeTruthy()
      expect(label(value)).not.toBe(value)
    }
  })
})

describe('label lookup, value by value', () => {
  it('labels every status', () => {
    expect(statusLabel('owned')).toBe('Owned')
    expect(statusLabel('watchlist')).toBe('Watchlist')
    expect(statusLabel('sold')).toBe('Sold')
  })

  it('labels every category', () => {
    expect(categoryLabel('pokemon')).toBe('Pokémon')
    expect(categoryLabel('yugioh')).toBe('Yu-Gi-Oh!')
    expect(categoryLabel('dragonball')).toBe('Dragon Ball Z')
    expect(categoryLabel('riftbound')).toBe('Riftbound')
    expect(categoryLabel('other')).toBe('Other')
  })

  it('labels every item type', () => {
    expect(itemTypeLabel('card')).toBe('Card')
    expect(itemTypeLabel('booster_pack')).toBe('Booster pack')
    expect(itemTypeLabel('booster_box')).toBe('Booster box')
    expect(itemTypeLabel('sealed_other')).toBe('Other sealed')
  })
})

describe('unknown values arriving from the database', () => {
  it('humanises an unrecognised value instead of showing the raw token', () => {
    expect(itemTypeLabel('graded_slab_case')).toBe('Graded slab case')
    expect(categoryLabel('magic_the_gathering')).toBe('Magic the gathering')
    expect(statusLabel('reserved')).toBe('Reserved')
  })

  it('returns null for a missing value so callers pick their own placeholder', () => {
    expect(categoryLabel(null)).toBe(null)
    expect(categoryLabel(undefined)).toBe(null)
    expect(statusLabel('')).toBe(null)
  })

  it('treats an unknown item_type as sealed, never as a bare card', () => {
    // New item_type values will be sealed formats; guessing "card" would let
    // grading language leak back onto sealed product.
    expect(isSealed('collector_tin')).toBe(true)
    expect(isSlabbed(item({ item_type: 'collector_tin', is_raw: false, grade: '9' }))).toBe(false)
    expect(gradeLabel(item({ item_type: 'collector_tin', is_raw: true }))).toBe('Collector tin')
  })
})

describe('isSealed', () => {
  it('is false for cards and true for every sealed form', () => {
    expect(isSealed('card')).toBe(false)
    expect(isSealed('booster_pack')).toBe(true)
    expect(isSealed('booster_box')).toBe(true)
    expect(isSealed('sealed_other')).toBe(true)
  })

  it('is false when item_type is missing rather than guessing sealed', () => {
    expect(isSealed(null)).toBe(false)
    expect(isSealed(undefined)).toBe(false)
  })
})

describe('isSlabbed', () => {
  it('is true only for a graded card', () => {
    expect(isSlabbed(item())).toBe(true)
  })

  it('is false for a raw card', () => {
    expect(isSlabbed(item({ is_raw: true, grade: null }))).toBe(false)
  })

  it('is false for a card marked graded but carrying no grade', () => {
    expect(isSlabbed(item({ is_raw: false, grade: null }))).toBe(false)
  })

  it('is false for sealed product, which is never slabbed', () => {
    expect(isSlabbed(item({ item_type: 'booster_box', is_raw: true, grade: null }))).toBe(false)
    // Even if grade fields somehow survived on a sealed row.
    expect(isSlabbed(item({ item_type: 'booster_box', is_raw: false, grade: '10' }))).toBe(false)
  })
})

describe('gradeLabel', () => {
  it('names the grading company and grade for a graded card', () => {
    expect(gradeLabel(item({ grade_company: 'BGS', grade: '9.5' }))).toBe('BGS 9.5')
  })

  it('says Raw for an ungraded card', () => {
    expect(gradeLabel(item({ is_raw: true, grade: null }))).toBe('Raw')
  })

  it('is null when a card has no grading information at all', () => {
    expect(gradeLabel(item({ is_raw: false, grade: null }))).toBe(null)
    expect(gradeLabel(item({ is_raw: false, grade_company: null, grade: '9' }))).toBe(null)
  })

  /**
   * The rule the Vault caption bug was fixed for: sealed product stores
   * is_raw = true because it is ungraded, and must still never read as "Raw".
   */
  it('never labels sealed product raw, even though it stores is_raw = true', () => {
    for (const type of ['booster_pack', 'booster_box', 'sealed_other']) {
      const label = gradeLabel(item({ item_type: type, is_raw: true, grade: null }))
      expect(label).toBe(ITEM_TYPE_LABELS[type])
      expect(label).not.toMatch(/raw/i)
    }
  })

  it('describes sealed product by its form, not its grading fields', () => {
    expect(gradeLabel(item({ item_type: 'booster_box', is_raw: true }))).toBe('Booster box')
    expect(gradeLabel(item({ item_type: 'sealed_other', is_raw: true }))).toBe('Other sealed')
  })
})
