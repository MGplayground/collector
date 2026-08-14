import { useState } from 'react'
import { ItemFilters } from '../components/collection/ItemFilters'
import { ItemList } from '../components/collection/ItemList'
import { useItems } from '../hooks/useItems'

export function CollectionPage() {
  const [filters, setFilters] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const { items, loading, error } = useItems(filters)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Collection</h2>
        <button className="btn btn--primary" onClick={() => {}}>+ Add</button>
      </div>
      {error && <p className="error-text">{error}</p>}
      <ItemFilters filters={filters} onChange={setFilters} />
      <ItemList items={items} loading={loading} onSelect={item => setSelectedId(item.id)} />
      {selectedId && <p style={{color:'var(--text-3)'}}>Selected: {selectedId} — detail view coming in Task 9</p>}
    </div>
  )
}
