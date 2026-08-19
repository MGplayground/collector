import { useState } from 'react'
import { marginPct, netProfit } from '../../domain/resale/profit'
import { formatMoney, formatPct } from '../../domain/money'

/**
 * Closing a sale by hand: what it went for, what Depop took, what postage cost.
 *
 * The fee is captured rather than computed — Depop has changed its rate before
 * and a historical sale must keep the fee that actually applied to it.
 */

/** Empty means unknown, not zero, so it goes to the database as null. */
const toNumberOrNull = value => (value === '' || value == null ? null : Number(value))

export function MarkSoldForm({ listing, item, onMarkSold, onCancel, onDone }) {
  const [form, setForm] = useState({
    sold_price: listing?.sold_price ?? listing?.price ?? '',
    platform_fee: listing?.platform_fee ?? '',
    shipping_cost: listing?.shipping_cost ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(key, value) { setForm(prev => ({ ...prev, [key]: value })) }

  // `toAmount` inside profit.js already reads '' as unknown, so the raw form
  // values can be previewed without a parsing pass of their own.
  const preview = { ...listing, ...form }
  const profit = netProfit(preview, item)
  const margin = marginPct(preview, item)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onMarkSold(listing.id, {
        sold_price: toNumberOrNull(form.sold_price),
        platform_fee: toNumberOrNull(form.platform_fee),
        shipping_cost: toNumberOrNull(form.shipping_cost),
      })
      onDone?.()
    } catch (err) {
      setError(err.message || 'Could not mark this as sold.')
    } finally {
      setSaving(false)
    }
  }

  const profitClass = profit == null ? '' : profit < 0 ? 'loss-text' : 'gain-text'

  return (
    <form className="sold-form form-grid" onSubmit={handleSubmit}>
      <label className="form-label">
        Sale price (£) *
        <input
          className="input" type="number" step="0.01" min="0" required
          value={form.sold_price} onChange={e => set('sold_price', e.target.value)}
        />
      </label>
      <div className="form-row">
        <label className="form-label">
          Depop fee (£)
          <input
            className="input" type="number" step="0.01" min="0"
            value={form.platform_fee} onChange={e => set('platform_fee', e.target.value)}
          />
        </label>
        <label className="form-label">
          Shipping (£)
          <input
            className="input" type="number" step="0.01" min="0"
            value={form.shipping_cost} onChange={e => set('shipping_cost', e.target.value)}
          />
        </label>
      </div>

      <div className="sold-form__result">
        <div className="sold-form__figure">
          <span className="sold-form__label">Net profit</span>
          <span className={`sold-form__value mono ${profitClass}`}>
            {formatMoney(profit, { signed: true })}
          </span>
        </div>
        <div className="sold-form__figure">
          <span className="sold-form__label">Margin on cost</span>
          <span className={`sold-form__value mono ${profitClass}`}>{formatPct(margin)}</span>
        </div>
        <p className="sold-form__note">
          Cost of the item {formatMoney(item?.cost)}. This is realised profit, net of fees —
          it is never added to the collection&rsquo;s unrealised gain.
        </p>
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Mark sold'}
        </button>
      </div>
    </form>
  )
}
