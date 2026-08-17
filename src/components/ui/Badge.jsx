import { categoryLabel, statusLabel } from '../../domain/item'

export function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{statusLabel(status)}</span>
}

export function CategoryBadge({ category }) {
  return <span className="badge badge--category">{categoryLabel(category)}</span>
}
