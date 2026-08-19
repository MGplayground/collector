/**
 * Category-specific attributes for a stock item.
 *
 * `resale_items.attributes` is jsonb, and these keys are the contract with
 * `domain/resale/templates.js`: a listing template interpolates `{{brand}}`,
 * `{{size}}`, `{{set}}` and so on against `item.attributes`. Renaming a key
 * here silently breaks every template that used it, so the keys are chosen to
 * read naturally inside a template and then left alone.
 *
 * Declarative on purpose. Adding a category is one entry in this map plus the
 * CHECK constraint in the migration — never a new branch in the form.
 */

/**
 * type is the input type. 'number' values are written to jsonb as numbers so
 * a measurement stays a measurement; everything else is a trimmed string.
 */
export const ATTRIBUTE_FIELDS = {
  clothing: [
    { key: 'brand',      label: 'Brand',           type: 'text',   placeholder: 'Carhartt' },
    { key: 'size',       label: 'Size',            type: 'text',   placeholder: 'M' },
    { key: 'colour',     label: 'Colour',          type: 'text',   placeholder: 'Washed black' },
    { key: 'material',   label: 'Material',        type: 'text',   placeholder: 'Cotton canvas' },
    { key: 'pit_to_pit', label: 'Pit to pit (cm)', type: 'number', step: '0.5', min: '0' },
    { key: 'length',     label: 'Length (cm)',     type: 'number', step: '0.5', min: '0' },
  ],
  cards: [
    { key: 'set',              label: 'Set',              type: 'text', placeholder: 'Surging Sparks' },
    { key: 'number',           label: 'Card number',      type: 'text', placeholder: '161/131' },
    { key: 'condition_detail', label: 'Condition detail', type: 'text', placeholder: 'Sharp corners, light edge wear' },
  ],
  sealed: [
    { key: 'set',      label: 'Set',      type: 'text', placeholder: 'Prismatic Evolutions' },
    { key: 'language', label: 'Language', type: 'text', placeholder: 'English' },
  ],
  other: [],
}

/** The fields for a category. Unknown categories simply have none. */
export function attributeFieldsFor(category) {
  return ATTRIBUTE_FIELDS[category] ?? []
}

/** Every key any category can produce — used to size the form's draft state. */
export const ATTRIBUTE_KEYS = [
  ...new Set(Object.values(ATTRIBUTE_FIELDS).flatMap(fields => fields.map(f => f.key))),
]

/**
 * Build the jsonb payload for one category.
 *
 * Only the selected category's keys are written: a jacket that was briefly
 * miscategorised as a card must not ship a stray `condition_detail` into the
 * template scope. Blank fields are dropped rather than stored as '', so
 * `render()` reports them as unresolved instead of interpolating nothing.
 *
 * Keys this map knows nothing about are carried through untouched — a template
 * may reference an attribute added by hand, and the intake form is not the
 * place that decides such a key is junk.
 */
export function toAttributes(category, draft = {}, existing = {}) {
  const attributes = {}
  for (const [key, value] of Object.entries(existing ?? {})) {
    if (!ATTRIBUTE_KEYS.includes(key)) attributes[key] = value
  }
  for (const field of attributeFieldsFor(category)) {
    const raw = draft[field.key]
    if (raw == null) continue
    const value = typeof raw === 'string' ? raw.trim() : raw
    if (value === '') continue
    if (field.type === 'number') {
      const n = Number(value)
      if (!Number.isFinite(n)) continue
      attributes[field.key] = n
    } else {
      attributes[field.key] = value
    }
  }
  return attributes
}

/** Existing attributes back into form state, as strings the inputs can hold. */
export function toAttributeDraft(attributes = {}) {
  const draft = {}
  for (const key of ATTRIBUTE_KEYS) {
    draft[key] = attributes?.[key] == null ? '' : String(attributes[key])
  }
  return draft
}
