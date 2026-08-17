import { format } from 'date-fns'
import { lazy, useState } from 'react'
import { gradeLabel } from '../../domain/item'
import { formatMoney, formatPct, gain, gainPct } from '../../domain/money'
import { usePriceHistory } from '../../hooks/usePriceHistory'
import { CategoryBadge, StatusBadge } from '../ui/Badge'
import { LazyChunk } from '../ui/ErrorBoundary'
import { Modal } from '../ui/Modal'
import { LogPriceForm } from './LogPriceForm'

// `recharts` is the bulk of the bundle and nothing on the Collection list needs it,
// so the chart is fetched only once a card is actually opened.
const PriceHistoryChart = lazy(() =>
  import('./PriceHistoryChart').then(m => ({ default: m.PriceHistoryChart }))
)

export function ItemDetail({ item, onEdit, onClose, onPriceLogged }) {
  const { history, loading, logPrice } = usePriceHistory(item.id)
  const [showLogPrice, setShowLogPrice] = useState(false)

  async function handleLogPrice(price, note) {
    await logPrice(price, note)
    onPriceLogged?.()
  }
  const abs = gain(item)
  const pct = gainPct(item)
  const gainClass = abs == null ? '' : abs >= 0 ? 'gain-text' : 'loss-text'

  const chartData = history.map(h => ({
    date: format(new Date(h.recorded_at), 'dd MMM yy'),
    price: Number(h.price),
    note: h.note,
  }))

  const grade = gradeLabel(item) ?? '—'

  return (
    <>
      <Modal title={item.name} onClose={onClose}>
        <div className="detail">
          <div className="detail__badges">
            <StatusBadge status={item.status} />
            <CategoryBadge category={item.category} />
            <span className="badge badge--category">{grade}</span>
          </div>

          <div className="detail__stats">
            <div className="detail__stat">
              <span className="detail__stat-label">Current value</span>
              <span className="detail__stat-value mono">{formatMoney(item.current_value)}</span>
            </div>
            <div className="detail__stat">
              <span className="detail__stat-label">Paid</span>
              <span className="detail__stat-value mono">{formatMoney(item.purchase_price)}</span>
            </div>
            {abs != null && (
              <div className="detail__stat">
                <span className="detail__stat-label">Gain / loss</span>
                <span className={`detail__stat-value mono ${gainClass}`}>
                  {formatMoney(abs, { signed: true })}
                  {pct != null && ` (${formatPct(pct)})`}
                </span>
              </div>
            )}
          </div>

          {item.cert_number && (
            <p className="detail__cert mono">Cert: {item.cert_number}</p>
          )}

          <div className="detail__section-title">Price history</div>
          {loading ? (
            <p className="detail__loading">Loading…</p>
          ) : chartData.length < 2 ? (
            <p className="detail__no-chart">Add at least two price points to see the chart.</p>
          ) : (
            <LazyChunk
              loading={<p className="detail__loading">Loading…</p>}
              error={
                <p className="detail__no-chart" role="alert">
                  Couldn’t load the chart. Reload the app to try again.
                </p>
              }
            >
              <PriceHistoryChart data={chartData} />
            </LazyChunk>
          )}

          {history.length > 0 && (
            <div className="detail__log">
              {[...history].reverse().map(h => (
                <div key={h.id} className="detail__log-entry">
                  <span className="detail__log-date mono">{format(new Date(h.recorded_at), 'dd MMM yyyy')}</span>
                  <span className="detail__log-price mono">{formatMoney(h.price)}</span>
                  {h.note && <span className="detail__log-note">{h.note}</span>}
                </div>
              ))}
            </div>
          )}

          {item.notes && (
            <>
              <div className="detail__section-title">Notes</div>
              <p className="detail__notes">{item.notes}</p>
            </>
          )}

          <div className="form-actions">
            <button className="btn btn--ghost" onClick={() => setShowLogPrice(true)}>Log price</button>
            <button className="btn btn--primary" onClick={() => { onClose(); onEdit(item) }}>Edit</button>
          </div>
        </div>
      </Modal>

      {showLogPrice && (
        <LogPriceForm
          item={item}
          onLog={handleLogPrice}
          onClose={() => setShowLogPrice(false)}
        />
      )}
    </>
  )
}
