import { describe, expect, it } from 'vitest'
import {
  NO_VALUE, formatMoney, formatMoneyCompact, formatPct, gain, gainPct, toAmount,
} from './money'

describe('formatMoney', () => {
  it('always shows pennies', () => {
    expect(formatMoney(1050)).toBe('£1,050.00')
    expect(formatMoney(0)).toBe('£0.00')
  })

  it('groups thousands', () => {
    expect(formatMoney(1234567.5)).toBe('£1,234,567.50')
  })

  it('never renders a third decimal place — the finding 3.1 regression', () => {
    // ItemDetail omitted maximumFractionDigits, which defaults to 3, and
    // rendered this as £1,050.005.
    expect(formatMoney(1050.005)).toBe('£1,050.01')
    expect(formatMoneyCompact(1050.005)).toBe('£1,050.01')
  })

  it('absorbs float drift from summing numeric(10,2) columns', () => {
    expect(formatMoney(119.94999999999993)).toBe('£119.95')
  })
})

describe('formatMoneyCompact', () => {
  it('drops pennies that carry no information', () => {
    expect(formatMoneyCompact(1050)).toBe('£1,050')
  })

  it('keeps pennies that do', () => {
    expect(formatMoneyCompact(119.95)).toBe('£119.95')
    expect(formatMoneyCompact(119.9)).toBe('£119.9')
  })
})

describe('no value', () => {
  it.each([null, undefined, ''])('renders %p as an em dash', value => {
    expect(formatMoney(value)).toBe(NO_VALUE)
    expect(formatMoneyCompact(value)).toBe(NO_VALUE)
    expect(formatPct(value)).toBe(NO_VALUE)
  })

  it('renders a non-numeric string as no value rather than £NaN', () => {
    expect(formatMoney('not a price')).toBe(NO_VALUE)
  })

  it('lets a caller supply its own placeholder', () => {
    expect(formatMoneyCompact(null, { placeholder: null })).toBe(null)
  })

  it('does not confuse zero with absence', () => {
    expect(formatMoney(0)).toBe('£0.00')
    expect(formatMoneyCompact(0)).toBe('£0')
  })
})

describe('string inputs, as PostgREST returns for numeric columns', () => {
  it('coerces them', () => {
    expect(formatMoney('1050.00')).toBe('£1,050.00')
    expect(formatMoneyCompact('1050.00')).toBe('£1,050')
    expect(formatPct('12.34')).toBe('+12.3%')
  })
})

describe('sign handling', () => {
  it('puts a U+2212 minus before the currency symbol, never inside the number', () => {
    expect(formatMoney(-50)).toBe('−£50.00')
    expect(formatMoney(-50).charCodeAt(0)).toBe(0x2212)
  })

  it('shows a minus whether or not a plus was asked for', () => {
    expect(formatMoney(-50, { signed: true })).toBe('−£50.00')
  })

  it('shows a plus only when asked', () => {
    expect(formatMoney(50)).toBe('£50.00')
    expect(formatMoney(50, { signed: true })).toBe('+£50.00')
    expect(formatMoney(0, { signed: true })).toBe('+£0.00')
  })

  it('does not render a signed negative zero', () => {
    expect(formatMoney(-0.001, { signed: true })).toBe('+£0.00')
    expect(formatPct(-0.001)).toBe('+0.0%')
  })
})

describe('formatPct', () => {
  it('is signed by default, because it always reports a change', () => {
    expect(formatPct(12.34)).toBe('+12.3%')
    expect(formatPct(-12.35)).toBe('−12.4%')
  })

  it('can be asked to drop the plus', () => {
    expect(formatPct(12.34, { signed: false })).toBe('12.3%')
  })

  it('keeps one decimal place, without grouping', () => {
    expect(formatPct(1234)).toBe('+1234.0%')
  })
})

describe('toAmount', () => {
  it('is the single coercion rule', () => {
    expect(toAmount('10.50')).toBe(10.5)
    expect(toAmount(null)).toBe(null)
    expect(toAmount('')).toBe(null)
    expect(toAmount(undefined)).toBe(null)
    expect(toAmount(NaN)).toBe(null)
    expect(toAmount(Infinity)).toBe(null)
  })
})

describe('gain', () => {
  const item = (over = {}) => ({ purchase_price: '100.00', current_value: '150.00', ...over })

  it('is the difference between what it is worth and what it cost', () => {
    expect(gain(item())).toBe(50)
    expect(gainPct(item())).toBeCloseTo(50)
  })

  it('is negative on a loss', () => {
    expect(gain(item({ current_value: '80.00' }))).toBe(-20)
    expect(gainPct(item({ current_value: '80.00' }))).toBeCloseTo(-20)
  })

  it('is null when the purchase price is unknown, not zero', () => {
    expect(gain(item({ purchase_price: null }))).toBe(null)
    expect(gainPct(item({ purchase_price: null }))).toBe(null)
    expect(gain(item({ purchase_price: '' }))).toBe(null)
  })

  it('is null when the current value is unknown', () => {
    expect(gain(item({ current_value: null }))).toBe(null)
    expect(gainPct(item({ current_value: null }))).toBe(null)
  })

  it('has no percentage on a zero cost basis', () => {
    expect(gain(item({ purchase_price: 0 }))).toBe(150)
    expect(gainPct(item({ purchase_price: 0 }))).toBe(null)
  })

  it('renders straight through the formatters', () => {
    expect(formatMoney(gain(item()), { signed: true })).toBe('+£50.00')
    expect(formatMoney(gain(item({ current_value: '50' })), { signed: true })).toBe('−£50.00')
    expect(formatMoney(gain(item({ purchase_price: null })))).toBe(NO_VALUE)
  })
})
