import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, PackageX } from 'lucide-react'
import { getLowStockProducts } from '../../utils/reports'
import type { Product } from '../../types'

const LOW_STOCK_THRESHOLD = 5

export default function LowStockAlerts({ products }: { products: Product[] }) {
  const lowStock = useMemo(
    () => getLowStockProducts(products, LOW_STOCK_THRESHOLD),
    [products],
  )

  return (
    <section className="glass glass-hover p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Productos con stock bajo</h3>
          <p className="text-xs text-slate-400">
            Alerta visual cuando hay ≤ {LOW_STOCK_THRESHOLD} unidades
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
          <PackageX className="h-5 w-5" />
        </div>
      </header>

      {lowStock.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lowStock.map((p) => {
            const critical = p.stock === 0
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  critical
                    ? 'border-rose-500/30 bg-rose-500/10'
                    : 'border-amber-500/25 bg-amber-500/[0.08]'
                }`}
              >
                <span className="text-2xl">{p.emoji || '📦'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{p.name}</p>
                  <p className="text-[11px] text-slate-400">{p.category}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${critical ? 'text-rose-300' : 'text-amber-300'}`}
                  >
                    {p.stock}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {critical ? 'Agotado' : 'Unid.'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-8 text-sm text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          Todo el inventario tiene stock suficiente.
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
        <AlertTriangle className="h-3.5 w-3.5" />
        Revisa estos productos para reponer existencias.
      </div>
    </section>
  )
}
