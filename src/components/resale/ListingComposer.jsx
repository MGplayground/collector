import { useEffect, useMemo, useState } from 'react'
import { compose, remainingChars, render, toDepopText, validate } from '../../domain/resale/templates'
import { DEPOP } from '../../domain/resale/types'
import { getTemplates } from '../../services/resale'

/**
 * Turn an item into the copy that gets pasted into Depop.
 *
 * Depop has one combined field, so the preview below is not an approximation
 * of what you will paste — it is `toDepopText()`, the exact string, and the
 * counter runs against that same string because that is what the 1000
 * character limit applies to.
 */

/**
 * Placeholders the user typed back in by hand.
 *
 * `render()` strips unresolved placeholders and reports them separately, so a
 * hole from a template never survives as literal `{{brand}}`. One typed
 * straight into the textarea would, and it must not reach a live listing.
 */
const LITERAL_PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g
const literalKeys = text => [...String(text ?? '').matchAll(LITERAL_PLACEHOLDER)].map(m => m[1])

/** Hashtags are stored bare; the `#` is presentation, and `toDepopText` adds it. */
const parseHashtags = value =>
  value.split(/[\s,]+/).map(t => t.replace(/^#+/, '').trim()).filter(Boolean)

const formatHashtags = tags => (tags ?? []).map(t => `#${t}`).join(' ')

export function ListingComposer({ item, listing, templates: provided, onSave, onCancel }) {
  const [templates, setTemplates] = useState(provided ?? [])
  const [loadError, setLoadError] = useState(null)
  const [templateId, setTemplateId] = useState('')
  const [draft, setDraft] = useState(() => ({
    title: listing?.title ?? '',
    description: listing?.description ?? '',
    hashtags: listing?.hashtags ?? [],
  }))
  const [hashtagText, setHashtagText] = useState(() => formatHashtags(listing?.hashtags))
  // Gaps are tracked per field so that editing a field clears only its own.
  const [gaps, setGaps] = useState({ title: [], description: [] })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (provided) { setTemplates(provided); return undefined }
    let live = true
    getTemplates()
      .then(rows => { if (live) setTemplates(rows ?? []) })
      .catch(err => { if (live) setLoadError(err.message || 'Could not load templates.') })
    return () => { live = false }
  }, [provided])

  function applyTemplate(id) {
    setTemplateId(id)
    setSaved(false)
    const template = templates.find(t => String(t.id) === String(id))
    if (!template) {
      setGaps({ title: [], description: [] })
      return
    }
    const composed = compose(template, item)
    setDraft({
      title: composed.title,
      description: composed.description,
      hashtags: composed.hashtags,
    })
    setHashtagText(formatHashtags(composed.hashtags))
    // `compose` reports gaps for the template as a whole; rendering each field
    // on its own says which field a gap came from, so typing over it clears it.
    setGaps({
      title: render(template.title_template, item).unresolved,
      description: render(template.description_template, item).unresolved,
    })
  }

  function edit(field, value) {
    setDraft(prev => ({ ...prev, [field]: value }))
    setGaps(prev => ({ ...prev, [field]: [] }))
    setSaved(false)
  }

  function editHashtags(value) {
    setHashtagText(value)
    setDraft(prev => ({ ...prev, hashtags: parseHashtags(value) }))
    setSaved(false)
  }

  const composed = useMemo(() => ({
    title: draft.title,
    description: draft.description,
    hashtags: draft.hashtags,
    unresolved: [...new Set([
      ...gaps.title,
      ...gaps.description,
      ...literalKeys(draft.title),
      ...literalKeys(draft.description),
    ])],
  }), [draft, gaps])

  const depopText = toDepopText(composed)
  const left = remainingChars(composed)
  const issues = validate(composed)
  // Placeholders the item had no value for. render() already stripped them, so
  // the copy is publishable — these are worth flagging, not worth blocking on.
  const missingDetails = composed.unresolved

  async function handleSubmit(e) {
    e.preventDefault()
    if (issues.length) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: draft.title.trim(),
        description: draft.description.trim(),
        hashtags: draft.hashtags,
      })
      setSaved(true)
    } catch (err) {
      setError(err.message || 'Could not save this copy onto the listing.')
    } finally {
      setSaving(false)
    }
  }

  const counterClass =
    left < 0 ? 'composer__counter--over' : left <= 100 ? 'composer__counter--near' : ''

  return (
    <form className="composer form-grid" onSubmit={handleSubmit}>
      <label className="form-label">
        Template
        <select
          className="input"
          value={templateId}
          onChange={e => applyTemplate(e.target.value)}
        >
          <option value="">No template — write it myself</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {loadError && <p className="error-text" role="alert">{loadError}</p>}

      <label className="form-label">
        Title
        <input
          className="input"
          value={draft.title}
          onChange={e => edit('title', e.target.value)}
        />
      </label>

      <label className="form-label">
        Description
        <textarea
          className="input"
          rows={7}
          value={draft.description}
          onChange={e => edit('description', e.target.value)}
        />
      </label>

      <label className="form-label">
        Hashtags
        <input
          className="input"
          value={hashtagText}
          onChange={e => editHashtags(e.target.value)}
          placeholder="#carhartt #workwear"
        />
        <span className="composer__hint">
          {draft.hashtags.length} of {DEPOP.MAX_HASHTAGS}. They count toward the character limit.
        </span>
      </label>

      <div className="composer__preview-head">
        <h3 className="composer__preview-title">What gets pasted into Depop</h3>
        <p className={`composer__counter mono ${counterClass}`} role="status">
          {left < 0
            ? `${-left} over the ${DEPOP.DESCRIPTION_LIMIT} limit`
            : `${left} of ${DEPOP.DESCRIPTION_LIMIT} left`}
        </p>
      </div>
      <pre className="composer__preview">{depopText}</pre>

      {missingDetails.length > 0 && (
        <div className="composer__gaps" role="status" aria-label="Missing details">
          <p className="composer__issues-title">
            No value for: {missingDetails.join(', ')}
          </p>
          <p className="composer__gaps-hint">
            Left out of the copy. Add them to the item if a buyer would ask.
          </p>
        </div>
      )}

      {issues.length > 0 && (
        <div className="composer__issues" role="alert">
          <p className="composer__issues-title">Fix before this can be saved</p>
          <ul className="composer__issue-list">
            {issues.map(issue => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      )}

      {error && <p className="error-text" role="alert">{error}</p>}
      {saved && !issues.length && <p className="composer__saved" role="status">Saved onto the listing.</p>}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        )}
        <button type="submit" className="btn btn--primary" disabled={saving || issues.length > 0}>
          {saving ? 'Saving…' : 'Save to listing'}
        </button>
      </div>
    </form>
  )
}
