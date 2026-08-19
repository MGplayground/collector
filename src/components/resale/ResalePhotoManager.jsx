import { useEffect, useRef, useState } from 'react'
import {
  addResalePhoto, photoUrl, removeResalePhoto, reorderResalePhotos,
} from '../../services/resale'
import { photoOverflow } from '../../domain/resale/state'
import { DEPOP } from '../../domain/resale/types'

const src = photo => photoUrl(photo.processed_path ?? photo.storage_path)

/**
 * The photos for one unit of stock.
 *
 * Plain multiple file input with no `capture` attribute — `capture` is the
 * part that breaks inside an installed iOS PWA, and the bare picker still
 * offers "Take Photo" there. Same reasoning as ImageUpload.
 *
 * Order is meaningful: position 0 is the cover, and Depop takes the first
 * DEPOP.MAX_PHOTOS. Reordering is done with buttons rather than drag and drop,
 * because HTML5 drag events never fire from a touchscreen and this is used
 * one-handed on a phone. Buttons are also the only version that works with a
 * keyboard or VoiceOver.
 */
export function ResalePhotoManager({ itemId, photos = [], onChange }) {
  const inputRef = useRef(null)
  const [order, setOrder] = useState(photos)
  const [progress, setProgress] = useState(null)
  const [uploadErrors, setUploadErrors] = useState([])
  const [error, setError] = useState(null)

  // Resync when the parent refetches. Keyed on the ids so a fresh array with
  // the same photos in the same order does not stamp on an in-flight move.
  const photoKey = photos.map(p => p.id).join(',')
  useEffect(() => { setOrder(photos) }, [photoKey])  // eslint-disable-line react-hooks/exhaustive-deps

  const overflow = photoOverflow(order)
  const busy = progress != null

  async function notify() {
    if (onChange) await onChange()
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''                 // let the same file be re-picked after a failure
    if (!files.length) return

    setUploadErrors([])
    setError(null)
    const failed = []
    let position = order.length

    for (const [index, file] of files.entries()) {
      setProgress({ done: index, total: files.length, name: file.name })
      try {
        await addResalePhoto(itemId, file, position)
        position += 1
      } catch (err) {
        // One bad file must not abandon the rest of the batch.
        failed.push({ name: file.name, message: err.message || 'Upload failed.' })
      }
    }

    setProgress(null)
    setUploadErrors(failed)
    await notify()
  }

  async function move(from, to) {
    if (to < 0 || to >= order.length) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)

    const previous = order
    setOrder(next)                      // optimistic: the tap has to feel instant
    setError(null)
    try {
      await reorderResalePhotos(next)
      await notify()
    } catch (err) {
      setOrder(previous)
      setError(err.message || 'Could not save the new photo order.')
    }
  }

  async function remove(photo) {
    setError(null)
    try {
      await removeResalePhoto(photo.id)
      const rest = order.filter(p => p.id !== photo.id)
      setOrder(rest)
      // Renumber so positions stay 0..n-1 and the cover is never a gap.
      if (rest.length) await reorderResalePhotos(rest)
      await notify()
    } catch (err) {
      setError(err.message || 'Could not remove that photo.')
    }
  }

  return (
    <div className="resale-photos">
      <div className="resale-photos__head">
        <span className="form-label__text">Photos</span>
        <span className="resale-photos__count mono">
          {order.length} / {DEPOP.MAX_PHOTOS}
        </span>
      </div>

      {order.length > 0 && (
        <ol className="resale-photos__grid">
          {order.map((photo, index) => (
            <li
              key={photo.id}
              className={`resale-photo${index >= DEPOP.MAX_PHOTOS ? ' resale-photo--extra' : ''}`}
            >
              <img className="resale-photo__img" src={src(photo)} alt={`Photo ${index + 1}`} loading="lazy" />
              <span className="resale-photo__tag">
                {index === 0 ? 'Cover' : index + 1}
              </span>
              <div className="resale-photo__actions">
                <button
                  type="button"
                  className="btn btn--ghost resale-photo__btn"
                  aria-label={`Move photo ${index + 1} earlier`}
                  disabled={index === 0 || busy}
                  onClick={() => move(index, index - 1)}
                >←</button>
                <button
                  type="button"
                  className="btn btn--ghost resale-photo__btn"
                  aria-label={`Move photo ${index + 1} later`}
                  disabled={index === order.length - 1 || busy}
                  onClick={() => move(index, index + 1)}
                >→</button>
                <button
                  type="button"
                  className="btn btn--danger resale-photo__btn"
                  aria-label={`Remove photo ${index + 1}`}
                  disabled={busy}
                  onClick={() => remove(photo)}
                >✕</button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {overflow > 0 && (
        <p className="resale-photos__warn" role="status">
          Depop takes {DEPOP.MAX_PHOTOS} photos. The last {overflow}{' '}
          {overflow === 1 ? 'photo' : 'photos'} will not transfer — reorder so the{' '}
          {DEPOP.MAX_PHOTOS} you want are first.
        </p>
      )}

      <div className="resale-photos__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? `Uploading ${progress.done + 1} of ${progress.total}…` : 'Add photos'}
        </button>
        <span className="resale-photos__hint mono">First photo is the cover</span>
      </div>

      {/* No `capture`: it breaks the picker inside an installed iOS PWA. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="resale-photos__input"
        onChange={handleFiles}
      />

      {uploadErrors.map(f => (
        <p className="error-text" role="alert" key={f.name}>{f.name}: {f.message}</p>
      ))}
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  )
}
