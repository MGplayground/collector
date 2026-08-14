import { format, parseISO } from 'date-fns'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function PortfolioChart({ timeline }) {
  if (timeline.length < 2) return (
    <div className="analytics-card">
      <h3 className="analytics-card__title">Portfolio value over time</h3>
      <p className="analytics-empty">Log price updates on your items to see this chart grow.</p>
    </div>
  )

  const data = timeline.map(t => ({
    date: format(parseISO(t.date), 'dd MMM yy'),
    total: t.total,
  }))

  return (
    <div className="analytics-card">
      <h3 className="analytics-card__title">Portfolio value over time</h3>
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
            formatter={v => [`£${Number(v).toLocaleString('en-GB', {minimumFractionDigits:2})}`, 'Portfolio']}
          />
          <Line type="monotone" dataKey="total" stroke="var(--gold)" strokeWidth={2} dot={{ fill: 'var(--gold)', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
