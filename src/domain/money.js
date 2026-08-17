/**
 * How money is rendered. The only place a `£` is produced.
 *
 * This exists because six components each defined their own `fmt` and they
 * disagreed: one omitted `maximumFractionDigits`, which defaults to 3, so a
 * computed gain could render three decimal places of pounds.
 *
 * Two rounding policies, deliberately:
 *
 *   formatMoney         £1,050.00   always pennies — stats, ledgers, tooltips,
 *                                   anywhere a column of figures must align
 *   formatMoneyCompact  £1,050      pennies only when they carry information,
 *                                   so £119.95 keeps them — dense captions
 *
 * Neither ever exceeds two decimals, because pounds do not have three.
 */

/** What a missing value looks like. Money we do not know is not money we call zero. */
export const NO_VALUE = '—'

/** U+2212 MINUS SIGN, not a hyphen. It aligns with the digits in the mono font. */
const MINUS = '−'

const EXACT   = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
const COMPACT = { minimumFractionDigits: 0, maximumFractionDigits: 2 }

const gbp = digits => new Intl.NumberFormat('en-GB', { ...digits })
const percent = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false,
})

/**
 * Read a value that may have come straight from PostgREST, which serialises
 * `numeric` columns as strings. Returns null for anything that is not a number
 * we can render — including '' , which `Number` would otherwise call zero.
 */
export function toAmount(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function render(value, digits, { signed = false, placeholder = NO_VALUE } = {}) {
  const n = toAmount(value)
  if (n === null) return placeholder

  const magnitude = gbp(digits).format(Math.abs(n))
  // Decide the sign from the rounded figure, so −0.001 is not shown as −£0.00.
  const negative = n < 0 && Math.round(Math.abs(n) * 100) !== 0
  const sign = negative ? MINUS : signed ? '+' : ''

  return `${sign}£${magnitude}`
}

/** £1,050.00 — always two decimals. */
export function formatMoney(value, options) {
  return render(value, EXACT, options)
}

/** £1,050, but £119.95 — pennies only when they say something. */
export function formatMoneyCompact(value, options) {
  return render(value, COMPACT, options)
}

/**
 * +12.3% / −12.3%. Signed by default, because a percentage in this app is
 * always a change rather than a proportion.
 */
export function formatPct(value, { signed = true, placeholder = NO_VALUE } = {}) {
  const n = toAmount(value)
  if (n === null) return placeholder

  const magnitude = percent.format(Math.abs(n))
  const negative = n < 0 && Math.round(Math.abs(n) * 10) !== 0
  const sign = negative ? MINUS : signed ? '+' : ''

  return `${sign}${magnitude}%`
}

/**
 * What an item has made or lost, in pounds. Null when either side is unknown —
 * an item with no purchase price has no gain, which is not the same as £0.
 */
export function gain(item) {
  const paid = toAmount(item?.purchase_price)
  const worth = toAmount(item?.current_value)
  if (paid === null || worth === null) return null
  return worth - paid
}

/**
 * The same, as a percentage of what was paid. Also null when nothing was paid,
 * since a gain on a £0 basis is not a percentage.
 */
export function gainPct(item) {
  const paid = toAmount(item?.purchase_price)
  const abs = gain(item)
  if (abs === null || !paid) return null
  return (abs / paid) * 100
}
