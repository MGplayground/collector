function fmt(n) {
  return '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })
}

export function Highlights({ mostValuable, trending }) {
  const hasValuable = mostValuable.length > 0
  const hasTrending = trending.length > 0
  if (!hasValuable && !hasTrending) return null

  return (
    <div className="analytics-card">
      <h3 className="analytics-card__title">Highlights</h3>
      {hasValuable && (
        <>
          <p className="gainers-section-label">Most valuable</p>
          {mostValuable.map(item => (
            <div key={item.id} className="gainer-row">
              <span className="gainer-row__name">{item.name}</span>
              <span className="gainer-row__abs mono">{fmt(item.current_value)}</span>
            </div>
          ))}
        </>
      )}
      {hasTrending && (
        <>
          <p className="gainers-section-label" style={{ marginTop: hasValuable ? 'var(--space-3)' : 0 }}>Trending (30 days)</p>
          {trending.map(item => (
            <div key={item.id} className="gainer-row">
              <span className="gainer-row__name">{item.name}</span>
              <span className={`gainer-row__pct mono ${item.recentMove >= 0 ? 'gain-text' : 'loss-text'}`}>
                {item.recentMove >= 0 ? '+' : '−'}{fmt(item.recentMove)}
              </span>
              <span className={`gainer-row__abs mono ${item.recentMovePct >= 0 ? 'gain-text' : 'loss-text'}`}>
                {item.recentMovePct >= 0 ? '+' : ''}{item.recentMovePct.toFixed(1)}%
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
