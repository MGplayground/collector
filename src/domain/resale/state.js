/**
 * The listing lifecycle.
 *
 *   draft ──publish──> listed ──sold──> sold        (terminal)
 *                        │  ↑
 *                    bump│  │relist
 *                        ↓  │
 *                      delisted
 *
 * Pure: no data access, no React. Every rule here is a unit test.
 */

import { DELISTED, DRAFT, LISTED, SOLD, DEPOP } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

/** Which states can follow which. Anything not listed here is rejected. */
const ALLOWED = {
  [DRAFT]:    [LISTED],
  [LISTED]:   [SOLD, DELISTED],
  [DELISTED]: [LISTED],   // relist
  [SOLD]:     [],         // terminal
}

export function canTransition(from, to) {
  return (ALLOWED[from] ?? []).includes(to)
}

/**
 * Is this listing publishable, and if not, what is missing?
 *
 * Returns the missing pieces rather than a boolean so the UI can say what to
 * fix instead of just disabling a button with no explanation.
 */
export function publishBlockers(listing, photos = []) {
  const missing = []
  if (!photos.length) missing.push('at least one photo')
  if (!listing?.title?.trim()) missing.push('a title')
  if (!listing?.description?.trim()) missing.push('a description')
  if (listing?.price == null || Number(listing.price) <= 0) missing.push('a price')
  if (listing?.state && listing.state !== DRAFT && listing.state !== DELISTED) {
    missing.push(`a draft or delisted listing (this one is ${listing.state})`)
  }
  return missing
}

export const canPublish = (listing, photos) => publishBlockers(listing, photos).length === 0

/** Only a live listing can be bumped. Sold and delisted ones never can. */
export const canBump = listing => listing?.state === LISTED

/**
 * When this listing next wants a bump.
 *
 * Counts from the last bump, falling back to when it went live. Null for
 * anything not currently live, so callers cannot accidentally schedule a
 * sold item.
 */
export function nextBumpAt(listing) {
  if (!canBump(listing)) return null
  const from = listing.last_bumped_at ?? listing.listed_at
  if (!from) return null
  const days = Number(listing.bump_days) || 3
  return new Date(new Date(from).getTime() + days * DAY_MS)
}

export function isDueForBump(listing, now = new Date()) {
  const due = nextBumpAt(listing)
  return due != null && due <= now
}

/** The bump worklist: what is due, most overdue first. */
export function dueForBump(listings = [], now = new Date()) {
  return listings
    .filter(l => isDueForBump(l, now))
    .sort((a, b) => nextBumpAt(a) - nextBumpAt(b))
}

/** Days until the next bump. Negative means overdue. Null when not applicable. */
export function daysUntilBump(listing, now = new Date()) {
  const due = nextBumpAt(listing)
  if (due == null) return null
  return Math.round((due - now) / DAY_MS)
}

/**
 * How many photos Depop will accept, and whether we have too many.
 * Extra photos are not an error — they just will not all make it across.
 */
export function photoOverflow(photos = []) {
  return Math.max(0, photos.length - DEPOP.MAX_PHOTOS)
}
