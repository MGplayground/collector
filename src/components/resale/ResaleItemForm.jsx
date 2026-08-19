import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { ResalePhotoManager } from './ResalePhotoManager'
import { attributeFieldsFor, toAttributeDraft, toAttributes } from './attributeFields'
import {
  CATEGORIES, CONDITIONS, categoryLabel, conditionLabel,
} from '../../domain/resale/types'

const empty = {
  name: '', category: 'clothing', condition: 'good',
  cost: '', acquired_at: '', source: '', location: '', notes: '',
}

function toForm(item) {
  if (!item) return { ...empty, attributes: toAttributeDraft({}) }
  return {
    name: item.name ?? '',
    category: item.category ?? 'clothing',
    condition: item.condition ?? 'good',
    cost: item.cost ?? '',
    acquired_at: item.acquired_at ?? '',
    source: item.source ?? '',
    location: item.location ?? '',
    notes: item.notes ?? '',
    attributes: toAttributeDraft(item.attributes),
  }
}

function toPayload(form, item) {
  return {
    name: form.name.trim(),
    category: form.category,
    condition: form.condition || null,
    cost: form.cost !== '' ? Number(form.cost) : null,
    acquired_at: form.acquired_at || null,
    source: form.source.trim() || null,
    location: form.location.trim() || null,
    notes: form.notes.trim() || null,
    // jsonb: the keys here are what listing templates interpolate.
    attributes: toAttributes(form.category, form.attributes, item?.attributes),
  }
}

/**
 * Add or edit one unit of stock.
 *
 * Structure follows ItemForm deliberately, error handling included: a save
 * that rejects has to say so in the form. The audit found the version without
 * a catch, where a failed insert just stopped the spinner and looked like a
 * modal that forgot to close.
 *
 * Category-specific fields come from `attributeFields.js` rather than a chain
 * of `category === 'clothing' && …`, so a new category is one map entry.
 */
export function ResaleItemForm({ item, onSave, onDelete, onClose, onPhotosChange }) {
  const [form, setForm] = useState(() => toForm(item))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState(null)

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  // Attribute drafts are kept for every key, not just the visible ones, so
  // switching category by mistake and switching back does not lose typing.
  function setAttribute(key, val) {
    setForm(prev => ({ ...prev, attributes: { ...prev.attributes, [key]: val } }))
  }

  const fields = attributeFieldsFor(form.category)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave(toPayload(form, item))
      onClose()
    } catch (err) {
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
    <Modal title={item ? 'Edit stock item' : 'Add stock item'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-label">
          Name *
          <input
            className="input"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
          />
        </label>

        <div className="form-row">
          <label className="form-label">
            Category
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>
          </label>
          <label className="form-label">
            Condition
            <select className="input" value={form.condition} onChange={e => set('condition', e.target.value)}>
              {CONDITIONS.map(c => <option key={c} value={c}>{conditionLabel(c)}</option>)}
            </select>
          </label>
        </div>

        {fields.length > 0 && (
          <fieldset className="resale-attrs">
            <legend className="resale-attrs__legend">
              {categoryLabel(form.category)} details
            </legend>
            <p className="resale-attrs__hint">
              These fill the {'{{placeholders}}'} in your listing templates.
            </p>
            <div className="resale-attrs__grid">
              {fields.map(field => (
                <label className="form-label" key={field.key}>
                  {field.label}
                  <input
                    className="input"
                    type={field.type}
                    inputMode={field.type === 'number' ? 'decimal' : undefined}
                    step={field.step}
                    min={field.min}
                    placeholder={field.placeholder}
                    value={form.attributes[field.key] ?? ''}
                    onChange={e => setAttribute(field.key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="form-row">
          <label className="form-label">
            Cost (£)
            <input
              className="input" type="number" step="0.01" min="0" inputMode="decimal"
              value={form.cost}
              onChange={e => set('cost', e.target.value)}
            />
          </label>
          <label className="form-label">
            Acquired
            <input
              className="input" type="date"
              value={form.acquired_at}
              onChange={e => set('acquired_at', e.target.value)}
            />
          </label>
        </div>

        <div className="form-row">
          <label className="form-label">
            Source
            <input
              className="input"
              value={form.source}
              onChange={e => set('source', e.target.value)}
              placeholder="Car boot, Vinted…"
            />
          </label>
          <label className="form-label">
            Location
            <input
              className="input"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Box 3, under bed"
            />
          </label>
        </div>

        <label className="form-label">
          Notes
          <textarea
            className="input" rows={3}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </label>

        {item
          ? (
            <ResalePhotoManager
              itemId={item.id}
              photos={item.resale_photos ?? []}
              onChange={onPhotosChange}
            />
          )
          : (
            <p className="resale-photos__hint">
              Save the item first — photos attach to it once it exists.
            </p>
          )}

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
