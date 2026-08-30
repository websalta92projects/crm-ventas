import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, UsersRound } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { getFrequentCustomers } from '../../utils/stats'
import { formatMoney } from '../../utils/format'

const AVATAR_COLORS = [
  'from-violet-500 to-indigo-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
]

interface TopCustomersListProps {
  onSelect?: (customerName: string) => void
}

export default function TopCustomersList({ onSelect }: TopCustomersListProps) {
  const sales = useSalesStore((s) => s.sales)
  const customers = useSalesStore((s) => s.customers)

  const top = useMemo(() => getFrequentCustomers(sales, customers, 5), [sales, customers])

  return (
    <section className="glass glass-hover flex h-full flex-col p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Clientes frecuentes</h3>
          <p className="text-xs text-secondary">Top 5 por monto total gastado</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
          <Users className="h-5 w-5" />
        </div>
      </header>

      {top.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
          <UsersRound className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">Aún no hay clientes frecuentes</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2">
          {top.map(({ customer, purchases, total }, i) => (
            <motion.li
              key={customer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ x: 3 }}
            >
              <button
                type="button"
                onClick={() => onSelect?.(customer.name)}
                title={`Ver ${customer.name} en Clientes`}
                className="flex w-full items-center gap-3 rounded-xl border border-app bg-card px-3 py-2.5 text-left transition-colors hover:border-violet-400/40 hover:bg-card"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-xs font-bold text-white`}
                >
                  {(customer.name[0] || '?').toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {customer.name}
                  </span>
                  <span className="block text-xs text-secondary">
                    {purchases} compra{purchases === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-emerald-300">
                  {formatMoney(total)}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  )
}
