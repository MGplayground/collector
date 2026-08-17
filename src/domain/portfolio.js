/**
 * What counts as "yours".
 *
 * This exists because the answer was previously re-derived in each place that
 * needed it, and one of those derivations (`status !== 'sold'`) quietly counted
 * watchlist items as part of the portfolio.
 */

export const OWNED = 'owned'
export const WATCHLIST = 'watchlist'
export const SOLD = 'sold'

export const isOwned = item => item.status === OWNED
export const isWatchlist = item => item.status === WATCHLIST
export const isSold = item => item.status === SOLD

/** Items you hold today. The only population that counts toward portfolio value. */
export const held = items => items.filter(isOwned)

/** Items you are tracking but do not own. Never counts toward value or cost basis. */
export const watched = items => items.filter(isWatchlist)

export function sumBy(items, key) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0)
}

/**
 * When an item entered the collection. Falls back to created_at, since
 * purchase_date is optional and an item with neither has no history to place.
 */
function acquiredOn(item) {
  return (item.purchase_date || item.created_at || '').slice(0, 10)
}

/**
 * Was this item held on the given day (YYYY-MM-DD)?
 *
 * Used by the portfolio timeline so a sold item stops contributing from its sale
 * date rather than counting forever. A sold item with no sale_date cannot be
 * placed in time, so it is treated as no longer held.
 */
export function heldOn(item, date) {
  if (isWatchlist(item)) return false
  if (isSold(item) && !item.sale_date) return false

  const acquired = acquiredOn(item)
  if (acquired && acquired > date) return false
  if (item.sale_date && item.sale_date.slice(0, 10) <= date) return false

  return true
}
