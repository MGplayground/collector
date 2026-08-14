import { useState } from 'react'
import { ItemFilters } from '../components/collection/ItemFilters'
import { ItemList } from '../components/collection/ItemList'
import { ItemForm } from '../components/collection/ItemForm'
import { useItems } from '../hooks/useItems'

export function CollectionPage() {
  const [filters, setFilters] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [formItem, setFormItem] = useState(null)   // null = closed, {} = add, item = edit
  const { items, loading, error, createItem, updateItem, deleteItem } = useItems(filters)

  function openAdd() { setFormItem({}) }
  function openEdit(item) { setFormItem(item) }
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
      <ItemFilters filters={filters} onChange={setFilters} />
      <ItemList
        items={items}
        loading={loading}
        onSelect={item => { setSelectedId(item.id); openEdit(item) }}
      />
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
