import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart as PieIcon } from 'lucide-react'
import { getSalesByProduct } from '../../utils/reports'
import { formatMoney } from '../../utils/format'
import type { Product, Sale } from '../../types'

const COLORS = ['#8b5cf6', '#0ea5e9', '#34d399', '#f59e0b', '#f472b6', '#22d3ee']

export default function SalesByProductChart({
  sales,
  products,
}: {
  sales: Sale[]
  products: Product[]
}) {
  const data = useMemo(() => getSalesByProduct(sales, products, 5), [sales, products])

  return (
    <section className="glass glass-hover flex h-full flex-col p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Ventas por producto</h3>
          <p className="text-xs text-secondary">Ingresos por producto</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <PieIcon className="h-5 w-5" />
        </div>
      </header>

      <div className="relative mx-auto h-48 w-full max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                color: '#e2e8f0',
                fontSize: 12,
              }}
              formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold text-white">{data.length}</p>
          <p className="text-[10px] text-secondary">productos</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {data.map((item, index) => (
          <li key={item.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="flex-1 truncate text-secondary">{item.name}</span>
            <span className="font-semibold text-white">{formatMoney(item.revenue)}</span>
          </li>
        ))}
        {data.length === 0 && (
          <li className="text-sm text-muted">Sin ventas registradas.</li>
        )}
      </ul>
    </section>
  )
}
