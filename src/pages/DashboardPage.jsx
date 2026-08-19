import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatMoney, formatPct } from '../domain/money'
import { summarise } from '../domain/resale/profit'
import { dueForBump } from '../domain/resale/state'
import { getAnalyticsData } from '../services/analytics'
import { getResaleItems } from '../services/resale'

/**
 * One screen, two modules, deliberately not one number.
 *
 * The dashboard is the only place that reads both the card tracker and the
 * resale module, and the spec is explicit about how: two independent queries,
 * composed after the fact. Nothing here joins the two datasets, and neither
 * module's code imports the other's — the only shared surface is `domain/money`.
 *
 * The figures are never added together either. Collection gain is unrealized
 * and gross; resale profit is realised and net of platform fees and shipping.
 * A "net worth" that sums them would be a number with no definition — the same
 * class of defect as the audit's "portfolio value that included the watchlist",
 * where two populations were quietly merged into one headline.
 */

/** The card tracker's half. One query. */
const loadCollection = () => getAnalyticsData()

/**
 * The resale half. One query, then pure domain functions over the result.
 * Listings arrive nested under their item, which is how the module stores them;
 * flattening happens here rather than in a join across modules.
 */
async function loadResale() {
  const items = await getResaleItems()
  const listings = items.flatMap(i => i.resale_listings ?? [])
  return { summary: summarise({ items, listings }), due: dueForBump(listings) }
}

/**
 * One module's data, with its own loading and failure state.
 *
 * Two queries means one can fail while the other is fine. Keeping the states
 * separate is what lets a failed resale fetch leave the collection figures on
 * screen instead of blanking the page. The `.catch` is not optional: Analytics
 * shipped without one once and hung on "Loading…" forever.
 */
function useModule(load) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', data: null, error: null })

    load()
      .then(data => { if (!cancelled) setState({ status: 'ready', data, error: null }) })
      .catch(err => {
        if (!cancelled) {
          setState({ status: 'error', data: null, error: err?.message || 'Something went wrong.' })
        }
      })

    return () => { cancelled = true }
  }, [load, attempt])

  const retry = useCallback(() => setAttempt(n => n + 1), [])
  return { ...state, retry }
}

function Stat({ label, value, className = '', note }) {
  return (
    <div className="summary-stat">
      <span className="summary-stat__label">{label}</span>
      <span className={`summary-stat__value mono ${className}`}>{value}</span>
      {note && <span className="summary-stat__note">{note}</span>}
    </div>
  )
}

/** Loading and failure for one module, scoped so it never takes the other down. */
function ModuleState({ status, error, retry, name }) {
  if (status === 'loading') return <p className="item-list-loading">Loading…</p>
  return (
    <div className="dash-module__failure">
      <p className="error-text" role="alert">
        Couldn’t load {name}: {error}
      </p>
      <button className="btn btn--ghost" onClick={retry}>Try again</button>
    </div>
  )
}

export function DashboardPage() {
  const collection = useModule(loadCollection)
  const resale = useModule(loadResale)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
      </div>

      {/* Resale leads because the bump worklist is the recurring task the module
          exists to stop you forgetting; it is the one thing here that is a job
          rather than a figure. */}
      <section className="dash-module dash-module--resale" aria-labelledby="dash-resale-title">
        <div className="dash-module__head">
          <h3 className="dash-module__title" id="dash-resale-title">Resale</h3>
          <span className="dash-module__basis">Realised, net of fees</span>
        </div>

        {resale.status === 'ready' ? (
          <ResaleModule {...resale.data} />
        ) : (
          <ModuleState {...resale} name="resale" />
        )}
      </section>

      <p className="dash-divider-note">
        Kept apart on purpose. Collection gain is unrealized and gross; resale profit is
        realised and net of fees. Adding them would produce a figure that means nothing,
        so the app never does.
      </p>

      <section className="dash-module dash-module--collection" aria-labelledby="dash-collection-title">
        <div className="dash-module__head">
          <h3 className="dash-module__title" id="dash-collection-title">Collection</h3>
          <span className="dash-module__basis">Unrealized, gross</span>
        </div>

        {collection.status === 'ready' ? (
          <CollectionModule data={collection.data} />
        ) : (
          <ModuleState {...collection} name="collection" />
        )}
      </section>
    </div>
  )
}

function ResaleModule({ summary, due }) {
  const { stockAtCost, stockCount, liveCount, soldCount, realisedProfit } = summary
  const count = due.length

  return (
    <>
      <Link
        to="/resale"
        className={`dash-bump${count ? ' dash-bump--due' : ''}`}
        aria-label={
          count ? `${count} listings due to bump. Open the resale worklist.` : 'Nothing due to bump'
        }
      >
        <span className="dash-bump__label">Due to bump</span>
        <span className="dash-bump__value mono">{count}</span>
        <span className="dash-bump__hint">
          {count
            ? `${count === 1 ? 'listing needs' : 'listings need'} bumping — open the worklist`
            : 'Nothing due. Every live listing is fresh.'}
        </span>
      </Link>

      <div className="summary-grid">
        <Stat
          label="Stock at cost"
          value={formatMoney(stockAtCost)}
          note={`${stockCount} ${stockCount === 1 ? 'unit' : 'units'} unsold, valued at what you paid`}
        />
        <Stat label="Live listings" value={liveCount} />
        <Stat label="Sold" value={soldCount} />
        <Stat
          label="Realised profit"
          value={formatMoney(realisedProfit, { signed: true })}
          className={realisedProfit >= 0 ? 'gain-text' : 'loss-text'}
        />
      </div>
    </>
  )
}

function CollectionModule({ data }) {
  const { totalValue, totalInvested, totalGain, heldCount, watchlistValue, watchlistCount } = data
  const pct = totalInvested ? (totalGain / totalInvested) * 100 : null

  return (
    <div className="summary-grid">
      <Stat
        label="Portfolio value"
        value={formatMoney(totalValue)}
        note={`${heldCount} ${heldCount === 1 ? 'item' : 'items'} owned`}
      />
      <Stat label="Cost basis" value={formatMoney(totalInvested)} />
      <Stat
        label="Unrealized gain"
        value={`${formatMoney(totalGain, { signed: true })}${pct === null ? '' : ` (${formatPct(pct)})`}`}
        className={totalGain >= 0 ? 'gain-text' : 'loss-text'}
      />
      <Stat
        label="Watchlist value"
        value={formatMoney(watchlistValue)}
        note={`${watchlistCount} tracked, not owned`}
      />
    </div>
  )
}
