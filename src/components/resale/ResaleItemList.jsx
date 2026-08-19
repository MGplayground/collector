import { ResaleItemCard } from './ResaleItemCard'
import { EmptyState } from '../ui/EmptyState'

export function ResaleItemList({ items = [], loading, onSelect }) {
  if (loading) return <div className="item-list-loading">Loading…</div>
  if (!items.length) return (
    <EmptyState
      title="No stock yet"
      body="Add the first thing you're reselling — photos and listing copy come after."
    />
  )
  return (
    <div className="item-list">
      {items.map(item => (
        <ResaleItemCard key={item.id} item={item} onClick={onSelect} />
      ))}
    </div>
  )
}
