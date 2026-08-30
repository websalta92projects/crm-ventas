import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, PackageSearch } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'

const MAX_ALERTS = 6

interface LowStockAlertsProps {
  onGoToProducts?: () => void
}

export default function LowStockAlerts({ onGoToProducts }: LowStockAlertsProps) {
  const products = useSalesStore((s) => s.products)

  const lowStock = useMemo(
    () =>
      products
        .filter((p) => p.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, MAX_ALERTS),
    [products],
  )

  return (
    <section className="glass glass-hover flex h-full flex-col p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Alertas de stock bajo</h3>
          <p className="text-xs text-secondary">Productos con ≤ 5 unidades</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
      </header>

      {lowStock.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
          <span className="text-2xl">✅</span>
          <p className="text-sm text-secondary">Todos los productos tienen stock suficiente</p>
        </div>
      ) : (
        <>
          <ul className="flex-1 space-y-2">
            {lowStock.map((p, i) => {
              const danger = p.stock <= 2
              return (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    danger
                      ? 'border-rose-500/30 bg-rose-500/10'
                      : 'border-amber-500/25 bg-amber-500/10'
                  }`}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-primary">
                    {p.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                      danger
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {p.stock} u.
                  </span>
                </motion.li>
              )
            })}
          </ul>

          {lowStock.length > 0 && (
            <button
              type="button"
              onClick={onGoToProducts}
              className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-app bg-card px-3 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-card hover:text-primary active:scale-95"
            >
              <PackageSearch className="h-4 w-4 text-sky-300" />
              Ir a productos
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </section>
  )
}
