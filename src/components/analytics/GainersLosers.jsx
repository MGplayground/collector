function fmt(n) {
  return '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })
}

export function GainersLosers({ withGain }) {
  if (!withGain.length) return null
  const gainers = withGain.filter(i => i.gainPct >= 0).slice(0, 3)
  const losers  = withGain.filter(i => i.gainPct < 0).slice(-3).reverse()

  return (
    <div className="analytics-card">
      <h3 className="analytics-card__title">Gainers &amp; losers</h3>
      {gainers.length > 0 && (
        <>
          <p className="gainers-section-label">Top gainers</p>
          {gainers.map(item => (
            <div key={item.id} className="gainer-row">
              <span className="gainer-row__name">{item.name}</span>
              <span className="gainer-row__pct mono gain-text">+{item.gainPct.toFixed(1)}%</span>
              <span className="gainer-row__abs mono gain-text">+{fmt(item.current_value - item.purchase_price)}</span>
            </div>
          ))}
        </>
      )}
      {losers.length > 0 && (
        <>
          <p className="gainers-section-label" style={{marginTop:'var(--space-3)'}}>Top losers</p>
          {losers.map(item => (
            <div key={item.id} className="gainer-row">
              <span className="gainer-row__name">{item.name}</span>
              <span className="gainer-row__pct mono loss-text">{item.gainPct.toFixed(1)}%</span>
              <span className="gainer-row__abs mono loss-text">−{fmt(item.purchase_price - item.current_value)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
