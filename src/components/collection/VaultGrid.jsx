import { EmptyState } from '../ui/EmptyState'
import { VaultTile } from './VaultTile'

export function VaultGrid({ items, loading, onSelect }) {
  if (loading) return <div className="item-list-loading">Loading…</div>
  if (!items.length) return (
    <EmptyState
      title="Nothing to show"
      body="No items match these filters."
    />
  )
  return (
    <div className="vault-grid">
      {items.map(item => (
        <VaultTile key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  )
}
