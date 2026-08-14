import { useCallback, useEffect, useState } from 'react'
import { createRelease, deleteRelease, getReleases, updateRelease } from '../services/releaseCalendar'

export function useReleaseCalendar() {
  const [releases, setReleases] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const data = await getReleases()
    setReleases(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function create(data) {
    const r = await createRelease(data)
    setReleases(prev => [...prev, r].sort((a, b) => a.release_date.localeCompare(b.release_date)))
  }
  async function update(id, data) {
    const r = await updateRelease(id, data)
    setReleases(prev => prev.map(x => x.id === id ? r : x))
  }
  async function remove(id) {
    await deleteRelease(id)
    setReleases(prev => prev.filter(x => x.id !== id))
  }

  return { releases, loading, create, update, remove }
}
