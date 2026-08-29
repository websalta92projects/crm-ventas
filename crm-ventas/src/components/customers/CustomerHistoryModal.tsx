import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { History, X } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { formatDateOnly, formatMoney } from '../../utils/format'
import { saleTotal, saleUnits } from '../../utils/sale'
import StatusBadge from '../sales/StatusBadge'
import type { Customer } from '../../types'

interface CustomerHistoryModalProps {
  open: boolean
  customer: Customer | null
  onClose: () => void
}

export default function CustomerHistoryModal({
  open,
  customer,
  onClose,
}: CustomerHistoryModalProps) {
  const sales = useSalesStore((s) => s.sales)

  const history = useMemo(() => {
    if (!customer) return []
    return sales
      .filter((s) => s.customerId === customer.id)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [sales, customer])

  const summary = useMemo(() => {
    let total = 0
    let items = 0
    for (const s of history) {
      total += saleTotal(s)
      items += saleUnits(s)
    }
    return { total, items }
  }, [history])

  return (
    <AnimatePresence>
      {open && customer && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="glass-strong my-4 w-[95%] max-h-[90vh] max-w-lg overflow-y-auto p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 shadow-lg shadow-violet-500/30">
                    <History className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{customer.name}</h3>
                    <p className="text-xs text-slate-400">
                      {customer.phone || 'Sin teléfono'} · {customer.email || 'Sin email'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Resumen */}
              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                  <p className="text-lg font-bold text-white">{history.length}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Compras</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                  <p className="text-lg font-bold text-white">{summary.items}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Artículos</p>
                </div>
                <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                  <p className="text-lg font-bold text-emerald-400">{formatMoney(summary.total)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Total gastado</p>
                </div>
              </div>

              {/* Historial */}
              {history.length > 0 ? (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {history.map((s) => {
                    const first = s.items[0]
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
                      >
                        <span className="text-lg">{first?.emoji ?? '📦'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {first?.name ?? 'Producto eliminado'}
                            {s.items.length > 1 && (
                              <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">
                                +{s.items.length - 1}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatDateOnly(s.date)} · {saleUnits(s)} u.
                          </p>
                        </div>
                        <StatusBadge status={s.status} />
                        <span className="font-semibold text-white">
                          {formatMoney(saleTotal(s))}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  Este cliente todavía no tiene compras registradas.
                </p>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
