import { useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: 'All', days: null },
]

function filterByRange(timeline, days) {
  if (!days) return timeline
  const cutoff = format(subDays(new Date(), days), 'yyyy-MM-dd')
  return timeline.filter(t => t.date >= cutoff)
}

export function PortfolioChart({ timeline }) {
  const [range, setRange] = useState('All')

  const selected = RANGES.find(r => r.label === range)
  const filtered = filterByRange(timeline, selected.days)

  const data = filtered.map(t => ({
    date: format(parseISO(t.date), 'dd MMM yy'),
    total: t.total,
  }))

  return (
    <div className="analytics-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <h3 className="analytics-card__title" style={{ marginBottom: 0 }}>Portfolio value over time</h3>
        <div className="chart-ranges">
          {RANGES.map(r => (
            <button
              key={r.label}
              className={`chart-range-btn${range === r.label ? ' chart-range-btn--active' : ''}`}
              onClick={() => setRange(r.label)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {data.length < 2 ? (
        <p className="analytics-empty">Log price updates on your items to see this chart grow.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
            <YAxis
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
              tickFormatter={v => `£${(v/1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-1)' }}
              formatter={v => [`£${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`, 'Portfolio']}
            />
            <Line type="monotone" dataKey="total" stroke="var(--gold)" strokeWidth={2} dot={{ fill: 'var(--gold)', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
