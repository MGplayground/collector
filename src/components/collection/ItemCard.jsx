import { formatMoney, formatPct, gainPct } from '../../domain/money'
import { CategoryBadge, StatusBadge } from '../ui/Badge'

export function ItemCard({ item, onClick }) {
  const pct = gainPct(item)
  const pctClass = pct == null ? '' : pct >= 0 ? 'gain-text' : 'loss-text'
  const gradeLabel = item.is_raw ? 'Raw' : item.grade_company && item.grade
    ? `${item.grade_company} ${item.grade}`
    : '—'

  return (
    <div className="item-card" onClick={() => onClick(item)}>
      {item.image_url && (
        <div className="item-card__img-wrap">
          <img src={item.image_url} alt={item.name} className="item-card__img" loading="lazy" />
        </div>
      )}
      <div className="item-card__body">
        <div className="item-card__meta">
          <StatusBadge status={item.status} />
          <CategoryBadge category={item.category} />
          <span className="item-card__grade mono">{gradeLabel}</span>
        </div>
        <p className="item-card__name">{item.name}</p>
        <div className="item-card__values">
          <span className="item-card__value mono">{formatMoney(item.current_value)}</span>
          {pct != null && (
            <span className={`item-card__pct mono ${pctClass}`}>{formatPct(pct)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
