/**
 * The vocabulary of an item: the three database enums, their display labels, and
 * the presentation facts derived from them.
 *
 * This exists because each enum was previously re-listed in every component that
 * rendered it — `CAT_LABELS` alone had four copies, and status labels were
 * title-cased ad hoc. Adding a category meant editing four files, and the file
 * you missed degraded silently to a raw token like `booster_box` on screen.
 *
 * The value arrays must stay identical to the CHECK constraints in
 * `supabase/migrations/` (001 for status and category, 002 for item_type). They
 * are the client-side mirror of those constraints, not a second opinion.
 */

/** A value the database has but this build does not recognise. */
const UNKNOWN = null

// ---------------------------------------------------------------------------
// status — items.status CHECK (001_initial_schema.sql)
// ---------------------------------------------------------------------------

export const OWNED = 'owned'
export const WATCHLIST = 'watchlist'
export const SOLD = 'sold'

export const STATUSES = [OWNED, WATCHLIST, SOLD]

export const STATUS_LABELS = {
  [OWNED]:     'Owned',
  [WATCHLIST]: 'Watchlist',
  [SOLD]:      'Sold',
}

// ---------------------------------------------------------------------------
// category — items.category CHECK (001_initial_schema.sql)
// ---------------------------------------------------------------------------

export const CATEGORIES = ['pokemon', 'yugioh', 'dragonball', 'riftbound', 'other']

export const CATEGORY_LABELS = {
  pokemon:    'Pokémon',
  yugioh:     'Yu-Gi-Oh!',
  dragonball: 'Dragon Ball Z',
  riftbound:  'Riftbound',
  other:      'Other',
}

// ---------------------------------------------------------------------------
// item_type — items.item_type CHECK (002_vault_item_type.sql)
// ---------------------------------------------------------------------------

export const CARD = 'card'

export const ITEM_TYPES = [CARD, 'booster_pack', 'booster_box', 'sealed_other']

export const ITEM_TYPE_LABELS = {
  [CARD]:         'Card',
  booster_pack:   'Booster pack',
  booster_box:    'Booster box',
  sealed_other:   'Other sealed',
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

/**
 * Best-effort label for a value this build has never heard of.
 *
 * A newer migration can add an enum value while an installed PWA is still
 * running old JavaScript, so the miss case has to be a real design decision
 * rather than an accident. Rendering the token verbatim is what the four
 * duplicate maps already did badly; `booster_box` is not a label. Turning it
 * into "Booster box" degrades to something a person can read, and — unlike a
 * generic "Unknown" — still says which value arrived, which is what anyone
 * debugging it needs.
 */
function humanise(value) {
  const text = String(value).replace(/_/g, ' ').trim()
  if (!text) return UNKNOWN
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function labelFrom(labels, value) {
  if (value == null) return UNKNOWN
  return labels[value] ?? humanise(value)
}

/** Display label for items.status. Null for a missing value. */
export const statusLabel = status => labelFrom(STATUS_LABELS, status)

/** Display label for items.category. Null for a missing value. */
export const categoryLabel = category => labelFrom(CATEGORY_LABELS, category)

/** Display label for items.item_type. Null for a missing value. */
export const itemTypeLabel = itemType => labelFrom(ITEM_TYPE_LABELS, itemType)

// ---------------------------------------------------------------------------
// Derived presentation
// ---------------------------------------------------------------------------

/**
 * item_type tracks *form* only — grading lives on is_raw / grade_company / grade.
 * Keeping the two axes separate is what stops a row saying "graded" and "raw" at
 * once.
 *
 * Anything that is not a card is sealed product, including an item_type this
 * build does not recognise: new values will be sealed formats, and treating an
 * unknown form as a bare card would re-open the grading conflation.
 */
export function isSealed(itemType) {
  return itemType != null && itemType !== CARD
}

/** Graded cards get the slab casing in the Vault; everything else renders bare. */
export function isSlabbed(item) {
  return item.item_type === CARD && !item.is_raw && Boolean(item.grade)
}

/**
 * How an item's grading reads on screen.
 *
 * Sealed product stores is_raw = true because it is ungraded, but labelling it
 * "Raw" re-creates the card/sealed conflation item_type exists to remove — that
 * bug was caught once already in the Vault caption. Sealed reads as its form;
 * only cards talk about grading.
 *
 * Returns null when a card carries no grading information at all, so each caller
 * picks its own placeholder rather than the domain layer choosing an em dash for
 * a chart legend.
 */
export function gradeLabel(item) {
  if (isSealed(item.item_type)) return itemTypeLabel(item.item_type) ?? 'Sealed'
  if (item.is_raw) return 'Raw'
  if (item.grade_company && item.grade) return `${item.grade_company} ${item.grade}`
  return UNKNOWN
}
