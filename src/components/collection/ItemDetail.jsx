import { format } from 'date-fns'
import { useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts'
import { usePriceHistory } from '../../hooks/usePriceHistory'
import { CategoryBadge, StatusBadge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { LogPriceForm } from './LogPriceForm'

function fmt(n) {
  if (n == null) return '—'
  return '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })
}

function gainInfo(item) {
  if (item.purchase_price == null || item.current_value == null)
    return { abs: null, pct: null }
  const abs = item.current_value - item.purchase_price
  const pct = (abs / item.purchase_price) * 100
  return { abs, pct }
}

export function ItemDetail({ item, onEdit, onClose, onPriceLogged }) {
  const { history, loading, logPrice } = usePriceHistory(item.id)
  const [showLogPrice, setShowLogPrice] = useState(false)

  async function handleLogPrice(price, note) {
    await logPrice(price, note)
    onPriceLogged?.()
  }
  const { abs, pct } = gainInfo(item)
  const gainClass = abs == null ? '' : abs >= 0 ? 'gain-text' : 'loss-text'

  const chartData = history.map(h => ({
    date: format(new Date(h.recorded_at), 'dd MMM yy'),
    price: Number(h.price),
    note: h.note,
  }))

  const gradeLabel = item.is_raw ? 'Raw / Ungraded'
    : item.grade_company && item.grade ? `${item.grade_company} ${item.grade}` : '—'

  return (
    <>
      <Modal title={item.name} onClose={onClose}>
        <div className="detail">
          <div className="detail__badges">
            <StatusBadge status={item.status} />
            <CategoryBadge category={item.category} />
            <span className="badge badge--category">{gradeLabel}</span>
          </div>

          <div className="detail__stats">
            <div className="detail__stat">
              <span className="detail__stat-label">Current value</span>
              <span className="detail__stat-value mono">{fmt(item.current_value)}</span>
            </div>
            <div className="detail__stat">
              <span className="detail__stat-label">Paid</span>
              <span className="detail__stat-value mono">{fmt(item.purchase_price)}</span>
            </div>
            {abs != null && (
              <div className="detail__stat">
                <span className="detail__stat-label">Gain / loss</span>
                <span className={`detail__stat-value mono ${gainClass}`}>
                  {abs >= 0 ? '+' : ''}{fmt(abs)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
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
            <div className="detail__chart">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                    tickFormatter={v => `£${v.toLocaleString('en-GB')}`}
                    width={64}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-1)' }}
                    formatter={v => [`£${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, 'Value']}
                  />
                  <Line type="monotone" dataKey="price" stroke="var(--gold)" strokeWidth={2} dot={{ fill: 'var(--gold)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {history.length > 0 && (
            <div className="detail__log">
              {[...history].reverse().map(h => (
                <div key={h.id} className="detail__log-entry">
                  <span className="detail__log-date mono">{format(new Date(h.recorded_at), 'dd MMM yyyy')}</span>
                  <span className="detail__log-price mono">{fmt(h.price)}</span>
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
