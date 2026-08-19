import { useResaleItems } from '../hooks/useResale'

/**
 * Composition point for the resale module. Sections are filled in by the
 * bump worklist, stock list and listing composer components.
 */
export function ResalePage() {
  const { loading, error } = useResaleItems()

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Resale</h2>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {loading && <p className="item-list-loading">Loading…</p>}
    </div>
  )
}
