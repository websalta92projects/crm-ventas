import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatMoney } from '../../utils/format'
import type { ActionItem } from './ActionsMenu'

export interface DetailLine {
  label: string
  value: string
  /** Línea de Total: más grande, en negrita y con borde superior. */
  strong?: boolean
  /** Texto con color destacado (ej. ganancia). */
  accent?: boolean
}

export interface DetailItem {
  name: string
  emoji: string
  quantity: number
  unitPrice: number
}

interface DetailModalProps {
  open: boolean
  title: string
  subtitle?: string
  icon: ReactNode
  customerName: string
  customerPhone: string
  items: DetailItem[]
  status: ReactNode
  lines: DetailLine[]
  actions: ActionItem[]
  onClose: () => void
}

/**
 * Modal de detalle en modo lectura: cliente, productos, totales, estado y acciones.
 * Reutiliza el estilo del modal "Nuevo presupuesto" (glass-strong, tarjetas p-4, space-y-4).
 */
export default function DetailModal({
  open,
  title,
  subtitle,
  icon,
  customerName,
  customerPhone,
  items,
  status,
  lines,
  actions,
  onClose,
}: DetailModalProps) {
  return (
    <AnimatePresence>
      {open && (
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
              className="glass-strong my-4 w-[95%] max-h-[90vh] max-w-lg overflow-y-auto p-4 sm:p-6"
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 shadow-lg shadow-violet-500/30">
                    {icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{title}</h3>
                    {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  title="Cerrar"
                  aria-label="Cerrar"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Cliente */}
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-xs font-bold text-white">
                    {(customerName[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{customerName}</p>
                    <p className="truncate text-xs text-slate-400">
                      {customerPhone || 'Sin teléfono'}
                    </p>
                  </div>
                  {status}
                </div>

                {/* Productos */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-400">
                    Productos ({items.length})
                  </p>
                  {items.length > 0 ? (
                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3"
                        >
                          <span className="text-lg">{item.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{item.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {formatMoney(item.unitPrice)} / u.
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-white">
                            × {item.quantity}
                          </span>
                          <span className="w-20 shrink-0 text-right text-sm font-semibold text-white">
                            {formatMoney(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500">
                      Sin productos
                    </p>
                  )}
                </div>

                {/* Totales */}
                <div className="rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-sky-500/10 p-4 text-sm shadow-lg shadow-violet-500/10">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex justify-between ${
                        idx > 0 ? 'mt-2' : ''
                      } ${line.strong ? 'border-t border-white/10 pt-2' : 'text-slate-400'}`}
                    >
                      <span className={line.strong ? 'font-semibold text-white' : ''}>
                        {line.label}
                      </span>
                      <span
                        className={
                          line.strong
                            ? 'text-lg font-extrabold text-emerald-300'
                            : `font-semibold ${line.accent ? 'text-emerald-400' : 'text-white'}`
                        }
                      >
                        {line.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Acciones */}
                {actions.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-2">
                    {actions.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        title={a.label}
                        aria-label={a.label}
                        disabled={a.disabled}
                        onClick={() => {
                          onClose()
                          a.onClick?.()
                        }}
                        className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                          a.disabled
                            ? 'text-slate-500'
                            : a.danger
                              ? 'border border-rose-400/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                              : 'glass glass-hover text-slate-200 hover:text-white'
                        }`}
                      >
                        {a.icon}
                        <span>{a.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
