import { useState } from 'react'
import { Modal } from '../ui/Modal'

export function LogPriceForm({ item, onLog, onClose }) {
  const [price, setPrice] = useState(item.current_value ?? '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!price) return
    setSaving(true)
    setError(null)
    try {
      await onLog(Number(price), note || null)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not log that price.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Log new price" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-label">
          New value (£)
          <input className="input" type="number" step="0.01" min="0" value={price}
            onChange={e => setPrice(e.target.value)} required autoFocus />
        </label>
        <label className="form-label">
          Note (optional)
          <input className="input" value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g. negotiated from £1,050 to £980" />
        </label>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Log price'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
