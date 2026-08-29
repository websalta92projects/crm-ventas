import { useMemo } from 'react'
import { Crown } from 'lucide-react'
import { getTopCustomers } from '../../utils/reports'
import { formatMoney } from '../../utils/format'
import type { Customer, Sale } from '../../types'

const MEDALS = ['🥇', '🥈', '🥉', '4.', '5.']

export default function TopCustomersList({
  sales,
  customers,
}: {
  sales: Sale[]
  customers: Customer[]
}) {
  const top = useMemo(() => getTopCustomers(sales, customers, 5), [sales, customers])

  return (
    <section className="glass glass-hover flex h-full flex-col p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Top 5 clientes</h3>
          <p className="text-xs text-slate-400">Por volumen de compra</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
          <Crown className="h-5 w-5" />
        </div>
      </header>

      <ul className="flex-1 space-y-3">
        {top.map((item, index) => (
          <li
            key={item.customer.id}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
          >
            <span className="w-7 text-center text-lg">{MEDALS[index]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{item.customer.name}</p>
              <p className="text-[11px] text-slate-500">
                {item.purchases} compra{item.purchases === 1 ? '' : 's'} · {item.items} artículos
              </p>
            </div>
            <span className="shrink-0 font-semibold text-emerald-400">
              {formatMoney(item.total)}
            </span>
          </li>
        ))}
        {top.length === 0 && (
          <li className="py-8 text-center text-sm text-slate-500">Sin clientes registrados.</li>
        )}
      </ul>
    </section>
  )
}
