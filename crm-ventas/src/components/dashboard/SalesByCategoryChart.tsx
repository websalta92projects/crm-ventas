import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartPie } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { getSalesByCategory } from '../../utils/stats'
import { formatMoney } from '../../utils/format'

const COLORS = ['#8b5cf6', '#0ea5e9', '#34d399', '#f59e0b', '#f472b6', '#22d3ee', '#a78bfa']

interface CategoryTooltipProps {
  active?: boolean
  payload?: { payload: { name: string; value: number; revenue: number; percent: number } }[]
}

// Tooltip con el porcentaje de cada categoría sobre el total vendido
function CategoryTooltip({ active, payload }: CategoryTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  return (
    <div className="z-50 rounded-lg border border-app bg-gray-800/90 p-2 text-sm shadow-xl backdrop-blur-md">
      <p className="font-bold text-white">{data.name}</p>
      <p className="mt-1 text-secondary">
        Total: <span className="font-semibold text-white">{formatMoney(data.revenue)}</span>
        <span className="ml-1 font-semibold text-sky-300">({data.percent}%)</span>
      </p>
      <p className="text-secondary">
        Unidades: <span className="font-semibold text-white">{data.value} u.</span>
      </p>
    </div>
  )
}

export default function SalesByCategoryChart() {
  const sales = useSalesStore((s) => s.sales)
  const products = useSalesStore((s) => s.products)

  const data = useMemo(() => {
    const rows = getSalesByCategory(sales, products)
    const total = rows.reduce((acc, r) => acc + r.revenue, 0)
    return rows.map((r) => ({
      ...r,
      percent: total > 0 ? Math.round((r.revenue / total) * 100) : 0,
    }))
  }, [sales, products])

  const totalRevenue = data.reduce((acc, d) => acc + d.revenue, 0)

  return (
    <section className="glass glass-hover flex h-full flex-col p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Ventas por categoría</h3>
          <p className="text-xs text-secondary">Pagadas y entregadas · 30 días</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
          <ChartPie className="h-5 w-5" />
        </div>
      </header>

      {data.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
          <ChartPie className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No hay ventas por categoría todavía</p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto h-52 w-full max-w-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="revenue"
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
                <Tooltip content={<CategoryTooltip />} wrapperStyle={{ outline: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-white">{formatMoney(totalRevenue)}</p>
              <p className="text-[11px] text-secondary">total</p>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {data.map((d, index) => (
              <li key={d.name} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="flex-1 truncate text-secondary">{d.name}</span>
                <span className="font-semibold text-white">{d.percent}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
