const STATUSES   = ['', 'owned', 'watchlist', 'sold']
const CATEGORIES = ['', 'pokemon', 'yugioh', 'dragonball', 'riftbound', 'other']
const SORTS      = [
  { value: 'date_desc',  label: 'Newest first' },
  { value: 'value_desc', label: 'Highest value' },
  { value: 'value_asc',  label: 'Lowest value' },
]
const CAT_LABELS = { pokemon: 'Pokémon', yugioh: 'Yu-Gi-Oh!', dragonball: 'Dragon Ball Z', riftbound: 'Riftbound', other: 'Other' }

export function ItemFilters({ filters, onChange }) {
  function set(key, value) { onChange({ ...filters, [key]: value || undefined }) }

  return (
    <div className="item-filters">
      <select className="item-filters__select" value={filters.status ?? ''} onChange={e => set('status', e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
      </select>
      <select className="item-filters__select" value={filters.category ?? ''} onChange={e => set('category', e.target.value)}>
        <option value="">All categories</option>
        {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
      </select>
      <select className="item-filters__select" value={filters.sortBy ?? 'date_desc'} onChange={e => set('sortBy', e.target.value)}>
        {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  )
}
