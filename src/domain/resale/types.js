/**
 * Vocabulary for the resale module.
 *
 * Mirrors the CHECK constraints in supabase/migrations/006_resale_module.sql.
 * Same rule as src/domain/item.js: these arrays are the client-side mirror of
 * the database constraints, not a second opinion.
 */

export const CATEGORIES = ['clothing', 'cards', 'sealed', 'other']

export const CATEGORY_LABELS = {
  clothing: 'Clothing',
  cards:    'Cards',
  sealed:   'Sealed product',
  other:    'Other',
}

export const CONDITIONS = ['new_with_tags', 'excellent', 'good', 'fair', 'worn']

export const CONDITION_LABELS = {
  new_with_tags: 'New with tags',
  excellent:     'Excellent',
  good:          'Good',
  fair:          'Fair',
  worn:          'Worn',
}

/** resale_items.state */
export const ITEM_STATES = ['draft', 'ready', 'listed', 'sold', 'archived']

/** resale_listings.state */
export const DRAFT = 'draft'
export const LISTED = 'listed'
export const SOLD = 'sold'
export const DELISTED = 'delisted'

export const LISTING_STATES = [DRAFT, LISTED, SOLD, DELISTED]

export const LISTING_STATE_LABELS = {
  [DRAFT]:    'Draft',
  [LISTED]:   'Live',
  [SOLD]:     'Sold',
  [DELISTED]: 'Delisted',
}

/**
 * Depop's actual constraints, confirmed August 2026.
 *
 * Depop has **one** combined title-and-description field, not two, capped at
 * 1000 characters — hashtags are written inside that same field and count
 * toward it. We keep title and description separate in our own model because
 * a list of items needs a short label, but the export is one string and the
 * limit applies to the whole thing.
 *
 * Photos: 4 per listing. Depop has been testing 8 for some accounts, so this
 * is the safe floor rather than the ceiling.
 */
export const DEPOP = {
  DESCRIPTION_LIMIT: 1000,
  MAX_HASHTAGS: 5,
  MAX_PHOTOS: 4,
}

const humanise = value => {
  const text = String(value ?? '').replace(/_/g, ' ').trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null
}

const labelFrom = (labels, value) =>
  value == null ? null : (labels[value] ?? humanise(value))

export const categoryLabel = c => labelFrom(CATEGORY_LABELS, c)
export const conditionLabel = c => labelFrom(CONDITION_LABELS, c)
export const listingStateLabel = s => labelFrom(LISTING_STATE_LABELS, s)
