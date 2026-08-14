import { useCallback, useEffect, useState } from 'react'
import { getPriceHistory, logPrice as logPriceSvc } from '../services/priceHistory'

export function usePriceHistory(itemId) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!itemId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getPriceHistory(itemId)
      setHistory(data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => { fetch() }, [fetch])

  async function logPrice(price, note) {
    await logPriceSvc(itemId, price, note)
    await fetch()
  }

  return { history, loading, error, logPrice, refetch: fetch }
}
