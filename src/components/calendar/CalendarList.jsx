import { differenceInDays, format, parseISO } from 'date-fns'

function findNextId(releases) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const future = releases.filter(r => parseISO(r.release_date) >= today)
  return future.length ? future[0].id : null
}

function deriveStatus(dateStr, isNext) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = parseISO(dateStr)
  if (d < today) return 'past'
  if (isNext) return 'next'
  return 'upcoming'
}

export function CalendarList({ releases, loading, onEdit }) {
  if (loading) return <p style={{ color: 'var(--text-3)' }}>Loading…</p>
  if (!releases.length) return (
    <div style={{ color: 'var(--text-3)', padding: 'var(--space-5)', textAlign: 'center' }}>
      No releases yet. Add one above.
    </div>
  )

  const nextId = findNextId(releases)

  return (
    <div className="cal-list">
      {releases.map(r => {
        const isNext = r.id === nextId
        const status = deriveStatus(r.release_date, isNext)
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const daysUntil = differenceInDays(parseISO(r.release_date), today)

        return (
          <div
            key={r.id}
            className={`cal-item${isNext ? ' cal-item--next' : ''}${status === 'past' ? ' cal-item--past' : ''}`}
            onClick={() => onEdit(r)}
          >
            <div className="cal-item__date mono">{format(parseISO(r.release_date), 'dd MMM yyyy')}</div>
            <div className="cal-item__body">
              <p className="cal-item__name">{r.name}</p>
              {r.game && <p className="cal-item__game">{r.game}{r.region ? ` · ${r.region}` : ''}</p>}
              {r.note && <p className="cal-item__note">{r.note}</p>}
            </div>
            <div className="cal-item__status">
              {isNext && daysUntil >= 0 && (
                <span className="cal-item__countdown">
                  {daysUntil === 0 ? 'Today!' : `${daysUntil}d`}
                </span>
              )}
              {!isNext && <span className={`badge badge--${status}`}>{status}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
