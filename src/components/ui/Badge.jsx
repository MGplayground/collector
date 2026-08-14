const CATEGORY_LABELS = {
  pokemon:    'Pokémon',
  yugioh:     'Yu-Gi-Oh!',
  dragonball: 'Dragon Ball Z',
  riftbound:  'Riftbound',
  other:      'Other',
}

export function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{status}</span>
}

export function CategoryBadge({ category }) {
  return <span className="badge badge--category">{CATEGORY_LABELS[category] ?? category}</span>
}
