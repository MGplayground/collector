import { useState } from 'react'
import { photoOverflow, publishBlockers } from '../../domain/resale/state'
import { toDepopText } from '../../domain/resale/templates'
import { DEPOP } from '../../domain/resale/types'
import { photoUrl } from '../../services/resale'

/**
 * The hand-off. There is no Depop API, so this screen's whole job is to make
 * the manual paste take seconds and then record that it happened:
 *
 *   copy the one combined field → save the photos → publish in the Depop app
 *   → paste the listing URL back here → the listing goes live in our records.
 */

/** Focus and select the fallback box, so a copy shortcut works straight away. */
const selectAll = node => { if (node) { node.focus(); node.select() } }

export function PublishPanel({ item, listing, photos, onPublish, onDone }) {
  const ordered = photos ?? item?.resale_photos ?? []
  const blockers = publishBlockers(listing, ordered)
  const overflow = photoOverflow(ordered)

  const text = toDepopText({
    title: listing?.title,
    description: listing?.description,
    hashtags: listing?.hashtags ?? [],
  })

  const [copied, setCopied] = useState(false)
  const [copyBlocked, setCopyBlocked] = useState(false)
  const [url, setUrl] = useState(listing?.external_url ?? '')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState(null)

  async function handleCopy() {
    setCopied(false)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setCopyBlocked(false)
    } catch {
      // Insecure origin, or permission denied. Never a silent no-op: show the
      // text in something selectable so the paste can still happen by hand.
      setCopyBlocked(true)
    }
  }

  async function handlePublish(e) {
    e.preventDefault()
    setPublishing(true)
    setError(null)
    try {
      await onPublish(listing.id, { external_url: url.trim() })
      onDone?.()
    } catch (err) {
      setError(err.message || 'Could not mark this as listed.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <section className="publish">
      {blockers.length > 0 && (
        <div className="publish__blockers" role="alert">
          <p className="publish__blockers-title">Still needed before this can go live</p>
          <ul className="publish__blocker-list">
            {blockers.map(b => <li key={b}>{b}</li>)}
          </ul>
        </div>
      )}

      <div className="publish__step">
        <h3 className="publish__step-title">1 · Copy the listing text</h3>
        <pre className="publish__text">{text}</pre>
        <button type="button" className="btn btn--primary publish__copy" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy text'}
        </button>
        {copyBlocked && (
          <div className="publish__fallback">
            <p className="error-text" role="alert">
              Your browser would not let us use the clipboard. The text is selected below — copy it by hand.
            </p>
            <textarea
              className="input publish__fallback-box"
              readOnly
              rows={8}
              value={text}
              ref={selectAll}
              aria-label="Listing text to copy by hand"
            />
          </div>
        )}
      </div>

      <div className="publish__step">
        <h3 className="publish__step-title">2 · Save the photos, in this order</h3>
        {ordered.length === 0
          ? <p className="publish__hint">No photos on this item yet.</p>
          : (
            <>
              <ol className="publish__photos">
                {ordered.map((photo, i) => (
                  <li
                    key={photo.id ?? i}
                    className={`publish__photo ${i >= DEPOP.MAX_PHOTOS ? 'publish__photo--extra' : ''}`}
                  >
                    <a
                      href={photoUrl(photo.processed_path ?? photo.storage_path)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        className="publish__photo-img"
                        src={photoUrl(photo.processed_path ?? photo.storage_path)}
                        alt={`Photo ${i + 1} of ${item?.name ?? 'this item'}`}
                        loading="lazy"
                      />
                    </a>
                    <span className="publish__photo-index mono">{i + 1}</span>
                  </li>
                ))}
              </ol>
              <p className="publish__hint">
                Long-press each photo to save it to your camera roll, or tap to open it full size.
              </p>
              {overflow > 0 && (
                <p className="publish__hint publish__hint--warn">
                  Depop takes {DEPOP.MAX_PHOTOS}; the last {overflow} will not fit.
                </p>
              )}
            </>
          )}
      </div>

      <form className="publish__step form-grid" onSubmit={handlePublish}>
        <h3 className="publish__step-title">3 · Publish on Depop, then paste the link back</h3>
        <label className="form-label">
          Depop listing URL
          <input
            className="input"
            type="url"
            required
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.depop.com/products/…"
          />
        </label>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={publishing || blockers.length > 0}
          >
            {publishing ? 'Saving…' : 'Mark as listed'}
          </button>
        </div>
      </form>
    </section>
  )
}
