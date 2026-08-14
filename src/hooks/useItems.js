import { useCallback, useEffect, useState } from 'react'
import { createItem, deleteItem, getItems, updateItem } from '../services/items'

export function useItems(filters = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const filtersKey = JSON.stringify(filters)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getItems(filters)
      if (filters.sortBy === 'gain_desc') {
        data.sort((a, b) => {
          const pctA = a.purchase_price && a.current_value
            ? (a.current_value - a.purchase_price) / a.purchase_price
            : null
          const pctB = b.purchase_price && b.current_value
            ? (b.current_value - b.purchase_price) / b.purchase_price
            : null
          if (pctA === null && pctB === null) return 0
          if (pctA === null) return 1
          if (pctB === null) return -1
          return pctB - pctA
        })
      }
      setItems(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => { fetch() }, [fetch])

  async function create(data) {
    const item = await createItem(data)
    setItems(prev => [item, ...prev])
    return item
  }

  async function update(id, data) {
    const item = await updateItem(id, data)
    setItems(prev => prev.map(i => i.id === id ? item : i))
    return item
  }

  async function remove(id) {
    await deleteItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, loading, error, refetch: fetch, createItem: create, updateItem: update, deleteItem: remove }
}
