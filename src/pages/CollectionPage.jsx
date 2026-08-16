import { useEffect, useState } from 'react'
import { ItemDetail } from '../components/collection/ItemDetail'
import { ItemFilters } from '../components/collection/ItemFilters'
import { ItemForm } from '../components/collection/ItemForm'
import { ItemList } from '../components/collection/ItemList'
import { VaultGrid } from '../components/collection/VaultGrid'
import { useItems } from '../hooks/useItems'

const VIEW_KEY = 'collector.collectionView'

function storedView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'vault' ? 'vault' : 'list'
  } catch {
    return 'list'   // private mode / storage disabled
  }
}

export function CollectionPage() {
  const [filters, setFilters] = useState({})
  const [view, setView] = useState(storedView)
  const [selectedId, setSelectedId] = useState(null)
  const [formItem, setFormItem] = useState(null)   // null = closed, {} = add, item = edit
  const { items, loading, error, refetch, createItem, updateItem, deleteItem } = useItems(filters)

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view) } catch { /* storage disabled — session-only */ }
  }, [view])

  function openAdd() { setFormItem({}) }
  function closeForm() { setFormItem(null) }

  async function handleSave(data) {
    if (formItem?.id) {
      await updateItem(formItem.id, data)
    } else {
      await createItem(data)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Collection</h2>
        <button className="btn btn--primary" onClick={openAdd}>+ Add</button>
      </div>
      {error && <p className="error-text">{error}</p>}
      <ItemFilters filters={filters} onChange={setFilters} view={view} onViewChange={setView} />
      {view === 'vault' ? (
        <VaultGrid
          items={items}
          loading={loading}
          onSelect={item => setSelectedId(item.id)}
        />
      ) : (
        <ItemList
          items={items}
          loading={loading}
          onSelect={item => setSelectedId(item.id)}
        />
      )}
      {(() => {
        const detailItem = selectedId ? items.find(i => i.id === selectedId) : null
        return detailItem ? (
          <ItemDetail
            item={detailItem}
            onEdit={item => { setSelectedId(null); setFormItem(item) }}
            onClose={() => setSelectedId(null)}
            onPriceLogged={refetch}
          />
        ) : null
      })()}
      {formItem !== null && (
        <ItemForm
          item={formItem?.id ? formItem : null}
          onSave={handleSave}
          onDelete={deleteItem}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
