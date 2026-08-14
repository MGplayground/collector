import { useCallback, useEffect, useState } from 'react'
import { getPriceHistory, logPrice as logPriceSvc } from '../services/priceHistory'

export function usePriceHistory(itemId) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!itemId) return
    setLoading(true)
    try {
      const data = await getPriceHistory(itemId)
      setHistory(data)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => { fetch() }, [fetch])

  async function logPrice(price, note) {
    await logPriceSvc(itemId, price, note)
    await fetch()
  }

  return { history, loading, logPrice, refetch: fetch }
}
