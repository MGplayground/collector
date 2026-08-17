import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { ImageUpload } from './ImageUpload'
import { ITEM_TYPES, ITEM_TYPE_LABELS, isSealed } from '../../lib/itemTypes'

const CATEGORIES = ['pokemon','yugioh','dragonball','riftbound','other']
const CAT_LABELS = { pokemon:'Pokémon', yugioh:'Yu-Gi-Oh!', dragonball:'Dragon Ball Z', riftbound:'Riftbound', other:'Other' }
const STATUSES   = ['owned','watchlist','sold']

const empty = {
  name:'', category:'pokemon', status:'watchlist', item_type:'card', is_raw:false,
  grade_company:'PSA', grade:'', purchase_price:'', purchase_date:'',
  current_value:'', quantity:1, seller_source:'', cert_number:'',
  image_url:'', sale_price:'', sale_date:'', notes:''
}

function toForm(item) {
  if (!item) return empty
  return {
    name: item.name ?? '',
    category: item.category ?? 'pokemon',
    status: item.status ?? 'watchlist',
    item_type: item.item_type ?? 'card',
    is_raw: item.is_raw ?? false,
    grade_company: item.grade_company ?? 'PSA',
    grade: item.grade ?? '',
    purchase_price: item.purchase_price ?? '',
    purchase_date: item.purchase_date ?? '',
    current_value: item.current_value ?? '',
    quantity: item.quantity ?? 1,
    seller_source: item.seller_source ?? '',
    cert_number: item.cert_number ?? '',
    image_url: item.image_url ?? '',
    sale_price: item.sale_price ?? '',
    sale_date: item.sale_date ?? '',
    notes: item.notes ?? '',
  }
}

function toPayload(form) {
  // Sealed product is ungraded by definition, so it always writes is_raw = true
  // and null grade fields — that is the conflation the item_type column removes.
  const graded = form.item_type === 'card' && !form.is_raw
  return {
    name: form.name.trim(),
    category: form.category,
    status: form.status,
    item_type: form.item_type,
    is_raw: isSealed(form.item_type) ? true : form.is_raw,
    grade_company: graded ? (form.grade_company || null) : null,
    grade: graded ? (form.grade || null) : null,
    purchase_price: form.purchase_price !== '' ? Number(form.purchase_price) : null,
    purchase_date: form.purchase_date || null,
    current_value: form.current_value !== '' ? Number(form.current_value) : null,
    quantity: Number(form.quantity) || 1,
    seller_source: form.seller_source || null,
    cert_number: form.cert_number || null,
    image_url: form.image_url || null,
    sale_price: form.status === 'sold' && form.sale_price !== '' ? Number(form.sale_price) : null,
    sale_date: form.status === 'sold' ? (form.sale_date || null) : null,
    notes: form.notes || null,
  }
}

export function ItemForm({ item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(toForm(item))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave(toPayload(form))
      onClose()
    } catch (err) {
      // Without this the modal just stops spinning and says nothing, which is
      // indistinguishable from a successful save that failed to close.
      setError(err.message || 'Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setError(null)
    try {
      await onDelete(item.id)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not delete this item.')
    }
  }

  return (
    <Modal title={item ? 'Edit item' : 'Add item'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-label">
          Name *
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
        </label>
        <div className="form-row">
          <label className="form-label">
            Category
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </label>
          <label className="form-label">
            Status
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </label>
        </div>
        <label className="form-label">
          Type
          <select className="input" value={form.item_type} onChange={e => set('item_type', e.target.value)}>
            {ITEM_TYPES.map(t => <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
        {!isSealed(form.item_type) && (
          <label className="form-label form-label--row">
            <input type="checkbox" checked={form.is_raw} onChange={e => set('is_raw', e.target.checked)} />
            Raw / ungraded (no grading company or grade)
          </label>
        )}
        {!isSealed(form.item_type) && !form.is_raw && (
          <div className="form-row">
            <label className="form-label">
              Grading company
              <input className="input" value={form.grade_company} onChange={e => set('grade_company', e.target.value)} placeholder="PSA" />
            </label>
            <label className="form-label">
              Grade
              <input className="input" value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="9" />
            </label>
          </div>
        )}
        <div className="form-row">
          <label className="form-label">
            Purchase price (£)
            <input className="input" type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} />
          </label>
          <label className="form-label">
            Purchase date
            <input className="input" type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label className="form-label">
            Current value (£)
            <input className="input" type="number" step="0.01" min="0" value={form.current_value} onChange={e => set('current_value', e.target.value)} />
          </label>
          <label className="form-label">
            Quantity
            <input className="input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label className="form-label">
            Seller / source
            <input className="input" value={form.seller_source} onChange={e => set('seller_source', e.target.value)} />
          </label>
          <label className="form-label">
            Cert number
            <input className="input" value={form.cert_number} onChange={e => set('cert_number', e.target.value)} placeholder="PSA cert #" />
          </label>
        </div>
        <ImageUpload value={form.image_url} onChange={url => set('image_url', url)} />
        {form.status === 'sold' && (
          <div className="form-row">
            <label className="form-label">
              Sale price (£)
              <input className="input" type="number" step="0.01" min="0" value={form.sale_price} onChange={e => set('sale_price', e.target.value)} />
            </label>
            <label className="form-label">
              Sale date
              <input className="input" type="date" value={form.sale_date} onChange={e => set('sale_date', e.target.value)} />
            </label>
          </div>
        )}
        <label className="form-label">
          Notes
          <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </label>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="form-actions">
          {item && !confirmDelete && (
            <button type="button" className="btn btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>
          )}
          {confirmDelete && (
            <button type="button" className="btn btn--danger" onClick={handleDelete}>Confirm delete</button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : (item ? 'Save changes' : 'Add item')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
