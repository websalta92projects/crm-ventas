import { motion } from 'framer-motion'
import { History, Mail, MapPin, Pencil, Phone, Trash2 } from 'lucide-react'
import type { Customer } from '../../types'
import { formatMoney } from '../../utils/format'

interface CustomerCardProps {
  customer: Customer
  purchases: { count: number; total: number }
  onViewHistory: () => void
  onEdit: () => void
  onDelete: () => void
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function CustomerCard({
  customer,
  purchases,
  onViewHistory,
  onEdit,
  onDelete,
}: CustomerCardProps) {
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
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-app bg-gradient-to-br from-violet-500/25 to-sky-500/15 text-sm font-bold text-primary">
          {initials(customer.name) || '👤'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white" title={customer.name}>
            {customer.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted">Cliente desde {customer.createdAt.slice(0, 10)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-secondary transition-colors hover:bg-sky-500/15 hover:text-sky-300"
            title="Editar cliente"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-secondary transition-colors hover:bg-rose-500/15 hover:text-rose-400"
            title="Eliminar cliente"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-secondary">
        {customer.phone && (
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted" />
            {customer.phone}
          </p>
        )}
        {customer.email && (
          <p className="flex items-center gap-2 truncate">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted" />
            <span className="truncate">{customer.email}</span>
          </p>
        )}
        {customer.address && (
          <p className="flex items-center gap-2 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" />
            <span className="truncate">{customer.address}</span>
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm">
        <span className="text-secondary">
          <span className="font-semibold text-white">{purchases.count}</span> compra
          {purchases.count === 1 ? '' : 's'}
        </span>
        <span className="font-semibold text-emerald-400">{formatMoney(purchases.total)}</span>
      </div>

      <button
        onClick={onViewHistory}
        className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-app bg-card px-3 py-2 text-xs font-medium text-secondary transition-all hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-primary"
      >
        <History className="h-3.5 w-3.5" />
        Ver historial de compras
      </button>
    </motion.article>
  )
}
