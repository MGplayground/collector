import { useCallback, useEffect, useState } from 'react'
import {
  bumpListing, createListing, createResaleItem, delistListing, deleteResaleItem,
  getResaleItems, markSold, publishListing, updateListing, updateResaleItem,
} from '../services/resale'

/**
 * Resale stock with its photos and listings.
 *
 * One fetch feeds the stock list, the bump worklist and the dashboard tile, so
 * they can never disagree about what is live.
 */
export function useResaleItems(filters = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const filtersKey = JSON.stringify(filters)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await getResaleItems(filters))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => { fetch() }, [fetch])

  /**
   * Every mutation refetches rather than patching local state. Publishing and
   * selling both touch two tables, so a local patch would drift; at a few items
   * a week the extra round trip costs nothing.
   */
  const run = useCallback(async fn => {
    const result = await fn()
    await fetch()
    return result
  }, [fetch])

  return {
    items, loading, error, refetch: fetch,
    createItem:  data => run(() => createResaleItem(data)),
    updateItem:  (id, data) => run(() => updateResaleItem(id, data)),
    deleteItem:  id => run(() => deleteResaleItem(id)),
    createListing: data => run(() => createListing(data)),
    updateListing: (id, data) => run(() => updateListing(id, data)),
    publish:     (id, opts) => run(() => publishListing(id, opts)),
    bump:        id => run(() => bumpListing(id)),
    markSold:    (id, sale) => run(() => markSold(id, sale)),
    delist:      id => run(() => delistListing(id)),
  }
}
