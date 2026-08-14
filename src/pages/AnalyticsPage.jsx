import { useEffect, useState } from 'react'
import { getAnalyticsData } from '../services/analytics'
import { CategoryBreakdown } from '../components/analytics/CategoryBreakdown'
import { GainersLosers } from '../components/analytics/GainersLosers'
import { PortfolioChart } from '../components/analytics/PortfolioChart'
import { PortfolioSummary } from '../components/analytics/PortfolioSummary'

export function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnalyticsData().then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <p style={{ color: 'var(--text-3)', padding: 'var(--space-5)' }}>Loading…</p>
  if (!data) return null

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Analytics</h2>
      </div>
      <PortfolioSummary data={data} />
      <PortfolioChart timeline={data.portfolioTimeline} />
      <CategoryBreakdown byCategory={data.byCategory} />
      <GainersLosers withGain={data.withGain} />
    </div>
  )
}
