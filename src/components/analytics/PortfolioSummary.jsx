function fmt(n, showSign = false) {
  const abs = Math.abs(n)
  const str = '£' + abs.toLocaleString('en-GB', { minimumFractionDigits: 2 })
  if (showSign) return (n >= 0 ? '+' : '−') + str
  return str
}

export function PortfolioSummary({ data }) {
  const { totalValue, totalInvested, totalGain, realizedGain } = data
  const gainPct = totalInvested ? (totalGain / totalInvested) * 100 : 0
  const gainClass = totalGain >= 0 ? 'gain-text' : 'loss-text'

  return (
    <div className="summary-grid">
      <div className="summary-stat summary-stat--hero">
        <span className="summary-stat__label">Cost basis</span>
        <span className="summary-stat__value mono">{fmt(totalInvested)}</span>
      </div>
      <div className="summary-stat summary-stat--hero">
        <span className="summary-stat__label">Portfolio value</span>
        <span className="summary-stat__value mono">{fmt(totalValue)}</span>
      </div>
      <div className="summary-stat">
        <span className="summary-stat__label">Unrealized gain</span>
        <span className={`summary-stat__value mono ${gainClass}`}>
          {fmt(totalGain, true)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
        </span>
      </div>
      <div className="summary-stat">
        <span className="summary-stat__label">Realized gain</span>
        <span className={`summary-stat__value mono ${realizedGain >= 0 ? 'gain-text' : 'loss-text'}`}>
          {fmt(realizedGain, true)}
        </span>
      </div>
    </div>
  )
}
