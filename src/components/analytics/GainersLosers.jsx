import { formatMoney, formatPct, gain } from '../../domain/money'

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
              <span className="gainer-row__pct mono gain-text">{formatPct(item.gainPct)}</span>
              <span className="gainer-row__abs mono gain-text">{formatMoney(gain(item), { signed: true })}</span>
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
              <span className="gainer-row__pct mono loss-text">{formatPct(item.gainPct)}</span>
              <span className="gainer-row__abs mono loss-text">{formatMoney(gain(item), { signed: true })}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
