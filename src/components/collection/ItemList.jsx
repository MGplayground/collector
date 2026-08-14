import { ItemCard } from './ItemCard'
import { EmptyState } from '../ui/EmptyState'

export function ItemList({ items, loading, onSelect }) {
  if (loading) return <div className="item-list-loading">Loading…</div>
  if (!items.length) return (
    <EmptyState
      title="No items yet"
      body="Add your first card or product to get started."
    />
  )
  return (
    <div className="item-list">
      {items.map(item => (
        <ItemCard key={item.id} item={item} onClick={onSelect} />
      ))}
    </div>
  )
}
