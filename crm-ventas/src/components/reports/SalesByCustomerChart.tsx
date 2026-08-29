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
import { Users } from 'lucide-react'
import { getSalesByCustomer } from '../../utils/reports'
import { formatCompact, formatMoney } from '../../utils/format'
import type { Customer, Sale } from '../../types'

export default function SalesByCustomerChart({
  sales,
  customers,
}: {
  sales: Sale[]
  customers: Customer[]
}) {
  const data = useMemo(() => getSalesByCustomer(sales, customers, 6), [sales, customers])

  return (
    <section className="glass glass-hover h-full p-5 md:p-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Ventas por cliente</h3>
          <p className="text-xs text-slate-400">Ingresos por cliente (top 6)</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
          <Users className="h-5 w-5" />
        </div>
      </header>

      <div className="h-[200px] w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                color: '#e2e8f0',
                fontSize: 12,
              }}
              cursor={{ fill: 'rgba(14,165,233,0.08)' }}
              formatter={(value) => formatMoney(Number(value))}
            />
            <Bar dataKey="revenue" name="Ingresos" fill="#0ea5e9" radius={[0, 6, 6, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
