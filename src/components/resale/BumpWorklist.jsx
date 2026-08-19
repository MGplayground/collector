import { useState } from 'react'
import { daysUntilBump, dueForBump } from '../../domain/resale/state'
import { formatMoneyCompact } from '../../domain/money'
import { EmptyState } from '../ui/EmptyState'

/**
 * What is due for a bump, most overdue first.
 *
 * Bumping is the recurring work of the module: Depop surfaces recently
 * touched listings, so a listing nobody has poked in a week is invisible.
 */

function overdueLabel(days) {
  if (days === null) return null
  if (days === 0) return 'Due today'
  if (days > 0) return `Due in ${days} day${days === 1 ? '' : 's'}`
  const late = -days
  return `${late} day${late === 1 ? '' : 's'} overdue`
}

export function BumpWorklist({ items = [], listings, onBump, onRefresh, now }) {
  const at = now ?? new Date()
  const [busyId, setBusyId] = useState(null)
  const [failure, setFailure] = useState(null)

  const rows = listings
    ?? items.flatMap(item => (item.resale_listings ?? []).map(l => ({ ...l, item })))

  const due = dueForBump(rows, at)

  async function handleBump(listing) {
    setBusyId(listing.id)
    setFailure(null)
    try {
      await onBump(listing.id)
    } catch (err) {
      // The service refuses to bump anything that is not still live, so this is
      // the sold-during-render race. Say so, then refetch: the row should go.
      setFailure({ id: listing.id, message: err.message || 'Could not record that bump.' })
      await onRefresh?.()
    } finally {
      setBusyId(null)
    }
  }

  if (due.length === 0) {
    return (
      <section className="bumps">
        <h3 className="bumps__title">Due for a bump</h3>
        <EmptyState title="Nothing due" body="Every live listing has been bumped recently." />
      </section>
    )
  }

  return (
    <section className="bumps">
      <h3 className="bumps__title">Due for a bump <span className="bumps__count mono">{due.length}</span></h3>
      <ul className="bumps__list">
        {due.map(listing => {
          const days = daysUntilBump(listing, at)
          const name = listing.item?.name ?? listing.title ?? 'Untitled listing'
          return (
            <li key={listing.id} className="bump-row">
              <div className="bump-row__body">
                <p className="bump-row__name">{name}</p>
                <p className="bump-row__meta">
                  <span className="bump-row__overdue">{overdueLabel(days)}</span>
                  {listing.price != null && (
                    <span className="mono"> · {formatMoneyCompact(listing.price)}</span>
                  )}
                </p>
                {failure?.id === listing.id && (
                  <p className="error-text bump-row__error" role="alert">{failure.message}</p>
                )}
              </div>
              <button
                type="button"
                className="btn btn--primary bump-row__btn"
                onClick={() => handleBump(listing)}
                disabled={busyId === listing.id}
              >
                {busyId === listing.id ? '…' : 'Bumped'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
