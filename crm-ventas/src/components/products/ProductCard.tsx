import { motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import type { Product } from '../../types'
import { formatMoney } from '../../utils/format'

interface ProductCardProps {
  product: Product
  salesCount: number
  onEdit: () => void
  onDelete: () => void
}

export default function ProductCard({ product, salesCount, onEdit, onDelete }: ProductCardProps) {
  const margin = product.price > 0 ? ((product.price - product.cost) / product.price) * 100 : 0
  const marginColor =
    margin >= 15 ? 'text-emerald-400' : margin >= 0 ? 'text-amber-400' : 'text-rose-400'
  const lowStock = product.stock <= 5

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -4 }}
      className="glass glass-hover flex flex-col p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-app bg-gradient-to-br from-violet-500/20 to-sky-500/10 text-2xl">
          {product.emoji || '📦'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white" title={product.name}>
            {product.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-secondary">
              {product.category}
            </span>
            {lowStock && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                Stock bajo
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-secondary transition-colors hover:bg-sky-500/15 hover:text-sky-300"
            title="Editar producto"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-secondary transition-colors hover:bg-rose-500/15 hover:text-rose-400"
            title="Eliminar producto"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-secondary">
        {product.description || 'Sin descripción.'}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">Precio venta</p>
          <p className="font-semibold text-white">{formatMoney(product.price)}</p>
        </div>
        <div className="rounded-xl bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">Costo</p>
          <p className="font-semibold text-secondary">{formatMoney(product.cost)}</p>
        </div>
        <div className="rounded-xl bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">Stock</p>
          <p className={`font-semibold ${lowStock ? 'text-amber-300' : 'text-white'}`}>
            {product.stock} u.
          </p>
        </div>
        <div className="rounded-xl bg-card px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">Margen</p>
          <p className={`font-semibold ${marginColor}`}>{margin.toFixed(1)}%</p>
        </div>
      </div>

      {salesCount > 0 && (
        <p className="mt-3 text-[11px] text-muted">
          {salesCount} venta{salesCount === 1 ? '' : 's'} registrada{salesCount === 1 ? '' : 's'}
        </p>
      )}
    </motion.article>
  )
}
