import { useEffect, useState } from 'react'
import { getAnalyticsData } from '../services/analytics'
import { CategoryBreakdown } from '../components/analytics/CategoryBreakdown'
import { GainersLosers } from '../components/analytics/GainersLosers'
import { PortfolioChart } from '../components/analytics/PortfolioChart'
import { PortfolioSummary } from '../components/analytics/PortfolioSummary'
import { Highlights } from '../components/analytics/Highlights'

export function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // No catch here previously, so a failed load left "Loading…" on screen forever.
    getAnalyticsData()
      .then(setData)
      .catch(err => setError(err.message || 'Could not load analytics.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="item-list-loading">Loading…</p>
  if (error) return (
    <div>
      <div className="page-header"><h2 className="page-title">Analytics</h2></div>
      <p className="error-text" role="alert">{error}</p>
    </div>
  )
  if (!data) return null

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Analytics</h2>
      </div>
      <PortfolioSummary data={data} />
      <Highlights mostValuable={data.mostValuable} trending={data.trending} />
      <PortfolioChart timeline={data.portfolioTimeline} />
      <CategoryBreakdown byCategory={data.byCategory} />
      <GainersLosers withGain={data.withGain} />
    </div>
  )
}
