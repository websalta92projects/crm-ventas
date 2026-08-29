import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ReceiptText, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSalesStore } from '../../store/salesStore'
import { formatDateTime, formatMoney } from '../../utils/format'
import { saleProfit, saleTotal, saleUnits } from '../../utils/sale'
import StatusBadge from '../sales/StatusBadge'
import type { Sale } from '../../types'

export default function RecentSales() {
  const sales = useSalesStore((s) => s.sales)
  const customers = useSalesStore((s) => s.customers)
  const removeSale = useSalesStore((s) => s.removeSale)

  const recent = useMemo(() => sales.slice(0, 8), [sales])
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])

  const handleRemove = (sale: Sale) => {
    removeSale(sale.id)
    toast('Venta eliminada', { icon: '🗑️' })
  }

  return (
    <section className="glass glass-hover p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Últimas ventas</h3>
          <p className="text-xs text-slate-400">Actividad reciente</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <ReceiptText className="h-5 w-5" />
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="data-table w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-slate-500">
              <th className="pb-3 pr-4 font-medium">Producto</th>
              <th className="pb-3 pr-4 font-medium">Cliente</th>
              <th className="pb-3 pr-4 font-medium">Fecha</th>
              <th className="pb-3 pr-4 font-medium">Estado</th>
              <th className="pb-3 pr-4 font-medium">Cant.</th>
              <th className="pb-3 pr-4 text-right font-medium">Total</th>
              <th className="pb-3 text-right font-medium">Ganancia</th>
              <th className="pb-3 pl-4" />
            </tr>
          </thead>
          <tbody>
            {recent.map((sale, i) => {
              const first = sale.items[0]
              return (
                <motion.tr
                  key={sale.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="border-b border-white/5 text-slate-300 last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{first?.emoji ?? '📦'}</span>
                      <span className="font-medium text-white">{first?.name ?? 'Producto'}</span>
                      {sale.items.length > 1 && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                          +{sale.items.length - 1}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {customerById.get(sale.customerId)?.name ?? 'Sin cliente'}
                  </td>
                  <td className="py-3 pr-4 text-slate-400">{formatDateTime(sale.date)}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={sale.status} />
                  </td>
                  <td className="py-3 pr-4">{saleUnits(sale)}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-white">
                    {formatMoney(saleTotal(sale))}
                  </td>
                  <td className="py-3 text-right font-semibold text-emerald-400">
                    {formatMoney(saleProfit(sale))}
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <button
                      onClick={() => handleRemove(sale)}
                      className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                      title="Eliminar venta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              )
            })}
            {recent.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  Todavía no hay ventas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
