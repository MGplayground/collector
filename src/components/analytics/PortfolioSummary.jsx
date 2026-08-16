function fmt(n, showSign = false) {
  const abs = Math.abs(n)
  const str = '£' + abs.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (showSign) return (n >= 0 ? '+' : '−') + str
  return str
}

export function PortfolioSummary({ data }) {
  const {
    totalValue, totalInvested, totalGain, realizedGain,
    heldCount, watchlistValue, watchlistCount,
  } = data

  const gainPct = totalInvested ? (totalGain / totalInvested) * 100 : 0
  const gainClass = totalGain >= 0 ? 'gain-text' : 'loss-text'

  const watchlistStat = watchlistCount > 0 && (
    <div className="summary-stat">
      <span className="summary-stat__label">
        Watchlist ({watchlistCount} {watchlistCount === 1 ? 'item' : 'items'})
      </span>
      <span className="summary-stat__value mono">{fmt(watchlistValue)}</span>
    </div>
  )

  // Nothing owned yet: four stat labels all reading £0.00 looks like a failure.
  // Say plainly that the portfolio is empty, and keep tracked value visible.
  if (heldCount === 0) {
    return (
      <div className="summary-grid">
        <div className="summary-stat summary-stat--hero">
          <span className="summary-stat__label">Portfolio</span>
          <span className="summary-stat__value">Nothing owned yet</span>
          <span className="summary-stat__note">
            Mark an item as owned to start tracking value and cost basis.
          </span>
        </div>
        {watchlistStat}
      </div>
    )
  }

  return (
    <div className="summary-grid">
      <div className="summary-stat summary-stat--hero">
        <span className="summary-stat__label">Cost basis</span>
        <span className="summary-stat__value mono">{fmt(totalInvested)}</span>
      </div>
      <div className="summary-stat summary-stat--hero">
        <span className="summary-stat__label">Portfolio value ({heldCount} owned)</span>
        <span className="summary-stat__value mono">{fmt(totalValue)}</span>
      </div>
      <div className="summary-stat">
        <span className="summary-stat__label">Unrealized gain</span>
        <span className={`summary-stat__value mono ${gainClass}`}>
          {fmt(totalGain, true)}
          {totalInvested > 0 && ` (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%)`}
        </span>
      </div>
      <div className="summary-stat">
        <span className="summary-stat__label">Realized gain</span>
        <span className={`summary-stat__value mono ${realizedGain >= 0 ? 'gain-text' : 'loss-text'}`}>
          {fmt(realizedGain, true)}
        </span>
      </div>
      {watchlistStat}
    </div>
  )
}
