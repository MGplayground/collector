import { CategoryBadge, StatusBadge } from '../ui/Badge'

function fmt(n) {
  if (n == null) return '—'
  return '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function gainPct(item) {
  if (item.purchase_price == null || item.current_value == null) return null
  return ((item.current_value - item.purchase_price) / item.purchase_price) * 100
}

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
          <span className="item-card__value mono">{fmt(item.current_value)}</span>
          {pct != null && (
            <span className={`item-card__pct mono ${pctClass}`}>
              {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
