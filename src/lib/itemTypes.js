export const ITEM_TYPES = ['card', 'booster_pack', 'booster_box', 'sealed_other']

export const ITEM_TYPE_LABELS = {
  card:          'Card',
  booster_pack:  'Booster pack',
  booster_box:   'Booster box',
  sealed_other:  'Other sealed',
}

/**
 * item_type tracks *form* only — grading lives on is_raw / grade_company / grade.
 * Keeping the two axes separate is what stops a row saying "graded" and "raw" at once.
 */
export function isSealed(itemType) {
  return itemType != null && itemType !== 'card'
}

/** Graded cards get the slab casing in the Vault; everything else renders bare. */
export function isSlabbed(item) {
  return item.item_type === 'card' && !item.is_raw && Boolean(item.grade)
}
