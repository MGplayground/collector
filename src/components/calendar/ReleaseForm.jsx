import { useState } from 'react'
import { Modal } from '../ui/Modal'

const empty = { name: '', game: '', release_date: '', region: '', note: '' }

function toForm(r) {
  if (!r) return empty
  return {
    name: r.name ?? '',
    game: r.game ?? '',
    release_date: r.release_date ?? '',
    region: r.region ?? '',
    note: r.note ?? '',
  }
}

export function ReleaseForm({ release, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(toForm(release))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name: form.name.trim(),
        game: form.game || null,
        release_date: form.release_date,
        region: form.region || null,
        note: form.note || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={release ? 'Edit release' : 'Add release'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-label">
          Name *
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
        </label>
        <div className="form-row">
          <label className="form-label">
            Game
            <input className="input" value={form.game} onChange={e => set('game', e.target.value)} placeholder="Riftbound" />
          </label>
          <label className="form-label">
            Region
            <input className="input" value={form.region} onChange={e => set('region', e.target.value)} placeholder="Global" />
          </label>
        </div>
        <label className="form-label">
          Release date *
          <input className="input" type="date" value={form.release_date} onChange={e => set('release_date', e.target.value)} required />
        </label>
        <label className="form-label">
          Note
          <textarea className="input" rows={2} value={form.note} onChange={e => set('note', e.target.value)} />
        </label>
        <div className="form-actions">
          {release && !confirmDelete && (
            <button type="button" className="btn btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>
          )}
          {confirmDelete && (
            <button type="button" className="btn btn--danger" onClick={() => { onDelete(release.id); onClose() }}>
              Confirm delete
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : (release ? 'Save' : 'Add release')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
