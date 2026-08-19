import { formatMoney } from '../../domain/money'
import { photoUrl } from '../../services/resale'
import {
  LISTED, categoryLabel, conditionLabel, listingStateLabel,
} from '../../domain/resale/types'

/**
 * The listing worth showing on the card: the live one if there is one,
 * otherwise the most recent. An item can accumulate delisted and sold
 * listings, and "Live" is the only one the stock list cares about.
 */
function currentListing(listings = []) {
  if (!listings.length) return null
  return listings.find(l => l.state === LISTED)
    ?? [...listings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
}

export function ResaleItemCard({ item, onClick }) {
  const cover = item.resale_photos?.[0]
  const listing = currentListing(item.resale_listings)

  return (
    <div className="item-card resale-card" onClick={() => onClick?.(item)}>
      <div className="item-card__img-wrap resale-card__img-wrap">
        {cover
          ? (
            <img
              className="item-card__img"
              src={photoUrl(cover.processed_path ?? cover.storage_path)}
              alt={item.name}
              loading="lazy"
            />
          )
          : <span className="resale-card__no-photo mono">No photo</span>}
      </div>

      <div className="item-card__body">
        <div className="item-card__meta">
          <span className="badge badge--category">{categoryLabel(item.category)}</span>
          {listing && (
            <span className={`badge badge--listing-${listing.state}`}>
              {listingStateLabel(listing.state)}
            </span>
          )}
          {item.condition && (
            <span className="item-card__grade">{conditionLabel(item.condition)}</span>
          )}
        </div>
        <p className="item-card__name">{item.name}</p>
        <div className="item-card__values">
          {/* formatMoney is the only currency formatter in this codebase. */}
          <span className="item-card__value mono">{formatMoney(item.cost)}</span>
          <span className="resale-card__cost-label">cost</span>
        </div>
      </div>
    </div>
  )
}
