import {
  CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts'
import { formatMoney, formatMoneyCompact } from '../../domain/money'

/**
 * Split out of ItemDetail so `recharts` lives in its own chunk: the modal only
 * mounts on tap, and only draws a chart at two or more price points. Markup and
 * chart props are unchanged from when this was inline.
 */
export function PriceHistoryChart({ data }) {
  return (
    <div className="detail__chart">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
          <YAxis
            tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            tickFormatter={v => formatMoneyCompact(v)}
            width={64}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-1)' }}
            formatter={v => [formatMoney(v), 'Value']}
          />
          <Line type="monotone" dataKey="price" stroke="var(--gold)" strokeWidth={2} dot={{ fill: 'var(--gold)', r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
