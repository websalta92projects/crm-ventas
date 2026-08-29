import { useMemo, type CSSProperties } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { getDailySeries } from '../../utils/stats'
import { formatCompact, formatMoney } from '../../utils/format'

interface ChartTooltipProps {
  active?: boolean
  payload?: { payload: { label: string; total: number; profit: number; count: number } }[]
  label?: string
  contentStyle?: CSSProperties
}

function ChartTooltip({ active, payload, label, contentStyle }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  return (
    <div className="glass-strong px-4 py-3 text-sm" style={contentStyle}>
      <p className="mb-2 font-semibold capitalize text-white">{label}</p>
      <p className="text-secondary">
        Ventas: <span className="font-semibold text-white">{formatMoney(data.total)}</span>
      </p>
      <p className="text-secondary">
        Ganancia: <span className="font-semibold text-emerald-400">{formatMoney(data.profit)}</span>
      </p>
      <p className="text-secondary">
        Unidades: <span className="font-semibold text-white">{data.count}</span>
      </p>
    </div>
  )
}

export default function SalesChart() {
  const sales = useSalesStore((s) => s.sales)
  const data = useMemo(() => getDailySeries(sales), [sales])

  return (
    <section className="glass glass-hover h-full p-5 md:p-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Ventas · Últimos 30 días</h3>
          <p className="text-xs text-secondary">Ingresos y ganancia diaria</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
          <TrendingUp className="h-5 w-5" />
        </div>
      </header>

      <div className="h-[200px] w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <Tooltip
              content={<ChartTooltip />}
              contentStyle={{ fontSize: 12 }}
              cursor={{ stroke: 'rgba(139,92,246,0.4)', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="total"
              name="Ventas"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              fill="url(#gradientTotal)"
            />
            <Area
              type="monotone"
              dataKey="profit"
              name="Ganancia"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#gradientProfit)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
