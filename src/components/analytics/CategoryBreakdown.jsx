import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { categoryLabel } from '../../domain/item'
import { formatMoney } from '../../domain/money'

// Slice colour is styling, not vocabulary — the labels come from the domain.
const COLORS = { pokemon:'#4ecdc4', yugioh:'#c9a84c', dragonball:'#e07a5f', riftbound:'#8fa8c0', other:'#4d6a82' }

export function CategoryBreakdown({ byCategory }) {
  const data = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: categoryLabel(key) ?? key, value, color: COLORS[key] ?? '#4d6a82' }))

  if (!data.length) return null

  return (
    <div className="analytics-card">
      <h3 className="analytics-card__title">By category</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={48}>
            {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-1)' }}
            formatter={v => [formatMoney(v), '']}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-2)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
