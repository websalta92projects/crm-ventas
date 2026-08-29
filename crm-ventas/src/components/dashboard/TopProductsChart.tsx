import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Trophy } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { getSalesSummary } from '../../utils/stats'
import { formatMoney } from '../../utils/format'

const COLORS = ['#8b5cf6', '#0ea5e9', '#34d399', '#f59e0b', '#f472b6']

interface PieTooltipProps {
  active?: boolean
  payload?: { payload: { name: string; value: number; revenue: number } }[]
}

// Tooltip personalizado: legible, con z-index alto para verse por encima de todo
function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  return (
    <div className="z-50 rounded-lg border border-white/10 bg-gray-800/90 p-2 text-sm shadow-xl backdrop-blur-md">
      <p className="font-bold text-white">{data.name}</p>
      <p className="mt-1 text-slate-300">
        Vendidos: <span className="font-semibold text-white">{data.value} u.</span>
      </p>
      <p className="text-slate-300">
        Total: <span className="font-semibold text-white">{formatMoney(data.revenue)}</span>
      </p>
    </div>
  )
}

export default function TopProductsChart() {
  const sales = useSalesStore((s) => s.sales)
  const products = useSalesStore((s) => s.products)

  const topProducts = useMemo(
    () => getSalesSummary(sales, products).topProducts,
    [sales, products],
  )

  const data = topProducts.map((tp) => ({
    name: tp.product.name,
    value: tp.quantity,
    revenue: tp.revenue,
  }))

  const totalUnits = data.reduce((acc, d) => acc + d.value, 0)

  return (
    <section className="glass glass-hover flex h-full flex-col p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Top productos</h3>
          <p className="text-xs text-slate-400">Más vendidos · 30 días</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
          <Trophy className="h-5 w-5" />
        </div>
      </header>

      <div className="relative mx-auto h-52 w-full max-w-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={<PieTooltip />}
              wrapperStyle={{ outline: 'none' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-white">{totalUnits}</p>
          <p className="text-[11px] text-slate-400">unidades</p>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {topProducts.map((tp, index) => (
          <li key={tp.product.id} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="flex-1 truncate text-slate-300">
              {tp.product.emoji} {tp.product.name}
            </span>
            <span className="font-semibold text-white">{tp.quantity} u.</span>
          </li>
        ))}
        {topProducts.length === 0 && (
          <li className="text-sm text-slate-500">Sin ventas en el período.</li>
        )}
      </ul>
    </section>
  )
}
