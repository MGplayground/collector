import { formatMoney, formatPct } from '../../domain/money'

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
      <span className="summary-stat__value mono">{formatMoney(watchlistValue)}</span>
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
        <span className="summary-stat__value mono">{formatMoney(totalInvested)}</span>
      </div>
      <div className="summary-stat summary-stat--hero">
        <span className="summary-stat__label">Portfolio value ({heldCount} owned)</span>
        <span className="summary-stat__value mono">{formatMoney(totalValue)}</span>
      </div>
      <div className="summary-stat">
        <span className="summary-stat__label">Unrealized gain</span>
        <span className={`summary-stat__value mono ${gainClass}`}>
          {formatMoney(totalGain, { signed: true })}
          {totalInvested > 0 && ` (${formatPct(gainPct)})`}
        </span>
      </div>
      <div className="summary-stat">
        <span className="summary-stat__label">Realized gain</span>
        <span className={`summary-stat__value mono ${realizedGain >= 0 ? 'gain-text' : 'loss-text'}`}>
          {formatMoney(realizedGain, { signed: true })}
        </span>
      </div>
      {watchlistStat}
    </div>
  )
}
