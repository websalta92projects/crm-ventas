import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { getMonthlySeries } from '../../utils/reports'
import { formatCompact, formatMoney } from '../../utils/format'
import type { Sale } from '../../types'

const tooltipStyle = {
  background: 'rgba(15, 23, 42, 0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#e2e8f0',
  backdropFilter: 'blur(12px)',
  fontSize: 12,
}

export default function SalesByMonthChart({ sales }: { sales: Sale[] }) {
  const data = useMemo(() => getMonthlySeries(sales), [sales])

  return (
    <section className="glass glass-hover h-full p-5 md:p-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Ventas por mes</h3>
          <p className="text-xs text-secondary">Ingresos y ganancia mensual</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
          <BarChart3 className="h-5 w-5" />
        </div>
      </header>

      <div className="h-[200px] w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={60}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'rgba(139,92,246,0.08)' }}
              formatter={(value) => formatMoney(Number(value))}
            />
            <Bar dataKey="total" name="Ventas" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={36} />
            <Bar dataKey="profit" name="Ganancia" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
