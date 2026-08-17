import { useRef, useState } from 'react'
import { uploadItemImage } from '../../services/images'

/**
 * Photo field for ItemForm.
 *
 * Deliberately a plain file input with no `capture` attribute: `capture` is the
 * part that breaks inside an installed iOS PWA, while the bare picker still
 * offers "Take Photo" there. The URL field stays as a fallback for images
 * already hosted elsewhere.
 */
export function ImageUpload({ value, onChange }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''            // let the same file be re-picked after a failure
    if (!file) return

    setBusy(true)
    setError(null)
    try {
      onChange(await uploadItemImage(file))
    } catch (err) {
      setError(err.message || 'Upload failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="image-upload">
      <span className="form-label__text">Photo</span>

      <div className="image-upload__row">
        {value
          ? <img src={value} alt="" className="image-upload__preview" />
          : <div className="image-upload__preview image-upload__preview--empty mono">No photo</div>}

        <div className="image-upload__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? 'Uploading…' : value ? 'Replace photo' : 'Add photo'}
          </button>
          {value && !busy && (
            <button type="button" className="btn btn--ghost" onClick={() => onChange('')}>
              Remove
            </button>
          )}
          <span className="image-upload__hint mono">Resized to 1600px before upload</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="image-upload__input"
          onChange={handleFile}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <input
        className="input"
        type="url"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder="…or paste an image URL"
      />
    </div>
  )
}
