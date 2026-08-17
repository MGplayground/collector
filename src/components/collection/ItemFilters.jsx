import { CATEGORIES, STATUSES, categoryLabel, statusLabel } from '../../domain/item'

const SORTS = [
  { value: 'date_desc',  label: 'Newest first' },
  { value: 'value_desc', label: 'Highest value' },
  { value: 'value_asc',  label: 'Lowest value' },
  { value: 'gain_desc',  label: 'Biggest gain %' },
]

export function ItemFilters({ filters, onChange, view, onViewChange }) {
  function set(key, value) { onChange({ ...filters, [key]: value || undefined }) }

  return (
    <div className="item-filters">
      <div className="view-toggle" role="group" aria-label="Collection view">
        <button
          type="button"
          className={`view-toggle__btn${view === 'list' ? ' view-toggle__btn--active' : ''}`}
          aria-pressed={view === 'list'}
          onClick={() => onViewChange('list')}
        >
          List
        </button>
        <button
          type="button"
          className={`view-toggle__btn${view === 'vault' ? ' view-toggle__btn--active' : ''}`}
          aria-pressed={view === 'vault'}
          onClick={() => onViewChange('vault')}
        >
          Vault
        </button>
      </div>
      <select className="item-filters__select" value={filters.status ?? ''} onChange={e => set('status', e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
      </select>
      <select className="item-filters__select" value={filters.category ?? ''} onChange={e => set('category', e.target.value)}>
        <option value="">All categories</option>
        {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
      </select>
      <select className="item-filters__select" value={filters.sortBy ?? 'date_desc'} onChange={e => set('sortBy', e.target.value)}>
        {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <input
        className="item-filters__input"
        type="number"
        min="0"
        placeholder="Min £"
        value={filters.minValue ?? ''}
        onChange={e => set('minValue', e.target.value ? Number(e.target.value) : undefined)}
      />
      <input
        className="item-filters__input"
        type="number"
        min="0"
        placeholder="Max £"
        value={filters.maxValue ?? ''}
        onChange={e => set('maxValue', e.target.value ? Number(e.target.value) : undefined)}
      />
    </div>
  )
}
