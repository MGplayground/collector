/**
 * Resale money.
 *
 * Distinct from src/domain/money.js, which formats. This decides what a sale
 * was actually worth, which is a different question from what the collection
 * is worth: resale profit is realised and net of fees, collection gain is
 * neither. The two must never be added into one figure.
 */

import { toAmount } from '../money'

/**
 * What a sale actually made: proceeds minus what it cost to buy and to sell.
 * Null until the listing is sold, because an unsold item has no profit.
 *
 * The fee is read from the listing rather than computed from a rate: Depop has
 * changed its rate before, and a sale from last year must keep the fee that
 * actually applied to it.
 */
export function netProfit(listing, item) {
  const sold = toAmount(listing?.sold_price)
  if (sold === null) return null

  const cost = toAmount(item?.cost) ?? 0
  const fee = toAmount(listing?.platform_fee) ?? 0
  const shipping = toAmount(listing?.shipping_cost) ?? 0

  return sold - cost - fee - shipping
}

/** Profit as a percentage of what the item cost. Null when it cost nothing known. */
export function marginPct(listing, item) {
  const profit = netProfit(listing, item)
  const cost = toAmount(item?.cost)
  if (profit === null || !cost) return null
  return (profit / cost) * 100
}

/**
 * Dashboard figures for the resale module.
 *
 * `stockAtCost` deliberately values unsold stock at what you paid, not at the
 * price you hope for — an asking price is not an asset.
 */
export function summarise({ items = [], listings = [] } = {}) {
  const byItem = new Map(items.map(i => [i.id, i]))

  const live = listings.filter(l => l.state === 'listed')
  const sold = listings.filter(l => l.state === 'sold')

  const unsold = items.filter(i => i.state !== 'sold' && i.state !== 'archived')

  const realisedProfit = sold.reduce(
    (total, l) => total + (netProfit(l, byItem.get(l.item_id)) ?? 0), 0)

  const soldRevenue = sold.reduce((total, l) => total + (toAmount(l.sold_price) ?? 0), 0)

  return {
    stockCount: unsold.length,
    stockAtCost: unsold.reduce((total, i) => total + (toAmount(i.cost) ?? 0), 0),
    liveCount: live.length,
    soldCount: sold.length,
    soldRevenue,
    realisedProfit,
  }
}
