import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  CheckCheck,
  ClipboardCopy,
  FilePlus2,
  FileText,
  MessageCircle,
  Pencil,
  Send,
  ShoppingCart,
  Trash2,
  XCircle,
} from 'lucide-react'
import BudgetFormModal from '../components/budgets/BudgetFormModal'
import StatusBadge from '../components/sales/StatusBadge'
import ConfirmModal from '../components/products/ConfirmModal'
import { useSalesStore } from '../store/salesStore'
import { useConfigStore } from '../store/configStore'
import { formatDateOnly, formatMoney } from '../utils/format'
import { BUDGET_STATUSES, BUDGET_STATUS_META } from '../utils/budgetStatus'
import { buildBudgetText, buildWhatsAppLink } from '../utils/budget'
import { generateBudgetPDF } from '../utils/documentPDF'
import type { Budget, BudgetStatus } from '../types'

interface BudgetsProps {
  onCreateSale?: (budgetId: string) => void
}

export default function Budgets({ onCreateSale }: BudgetsProps) {
  const budgets = useSalesStore((s) => s.budgets)
  const customers = useSalesStore((s) => s.customers)
  const removeBudget = useSalesStore((s) => s.removeBudget)
  const setBudgetStatus = useSalesStore((s) => s.setBudgetStatus)

  const [statusFilter, setStatusFilter] = useState<'all' | BudgetStatus>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [deleting, setDeleting] = useState<Budget | null>(null)

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])

  const filtered = useMemo(
    () =>
      budgets
        .filter((b) => statusFilter === 'all' || b.status === statusFilter)
        .sort((a, b) => b.number - a.number),
    [budgets, statusFilter],
  )

  const activeCount = useMemo(
    () => budgets.filter((b) => b.status === 'enviado' || b.status === 'aceptado').length,
    [budgets],
  )

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (b: Budget) => {
    setEditing(b)
    setFormOpen(true)
  }

  const copyBudget = async (b: Budget) => {
    try {
      const text = buildBudgetText({
        numberLabel: String(b.number),
        customerName: customerById.get(b.customerId)?.name ?? 'Sin cliente',
        date: formatDateOnly(b.createdAt),
        items: b.items,
        subtotal: b.subtotal,
        tax: b.tax,
        total: b.total,
        footer: useConfigStore.getState().config.footer,
      })
      await navigator.clipboard.writeText(text)
      toast.success(`Presupuesto #${b.number} copiado 📋`)
    } catch {
      toast.error('No se pudo copiar el texto')
    }
  }

  const changeStatus = (b: Budget, status: BudgetStatus, message: string) => {
    setBudgetStatus(b.id, status)
    toast.success(message)
  }

  const handlePdf = async (b: Budget) => {
    try {
      await generateBudgetPDF(
        b,
        customerById.get(b.customerId),
        useConfigStore.getState().config,
      )
      toast.success('PDF generado 📄')
    } catch {
      toast.error('No se pudo generar el PDF')
    }
  }

  // Envío por WhatsApp: EXACTAMENTE el mismo texto que '📋 Copiar' (buildBudgetText)
  const whatsappBudget = (b: Budget) => {
    const customer = customerById.get(b.customerId)
    if (!customer?.phone) {
      toast.error('El cliente no tiene teléfono registrado')
      return
    }
    const text = buildBudgetText({
      numberLabel: String(b.number),
      customerName: customerById.get(b.customerId)?.name ?? 'Sin cliente',
      date: formatDateOnly(b.createdAt),
      items: b.items,
      subtotal: b.subtotal,
      tax: b.tax,
      total: b.total,
      footer: useConfigStore.getState().config.footer,
    })
    window.open(buildWhatsAppLink(customer.phone, text), '_blank')
  }

  const handleDelete = () => {
    if (!deleting) return
    removeBudget(deleting.id)
    toast('Presupuesto eliminado', { icon: '🗑️' })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | BudgetStatus)}
            className="bg-transparent text-sm text-slate-200 focus:outline-none [&>option]:bg-slate-900"
          >
            <option value="all">Todos los estados</option>
            {BUDGET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BUDGET_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreate}
          className="ml-auto flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-95 sm:w-auto"
        >
          <FilePlus2 className="h-4 w-4" />
          Nuevo presupuesto
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} presupuestos ·{' '}
        <span className="text-emerald-400">{activeCount} activos</span> (enviados + aceptados)
        {statusFilter !== 'all' && ` en «${BUDGET_STATUS_META[statusFilter].label}»`}
      </p>

      {/* Tabla de presupuestos */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">Folio</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Productos</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-white/5 text-slate-300 last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-3">
                    <span className="font-semibold text-white">#{b.number}</span>
                  </td>
                  <td className="px-4 py-3">
                    {customerById.get(b.customerId)?.name ?? 'Sin cliente'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className="text-lg">{b.items[0]?.emoji ?? '📄'}</span>
                      {b.items.length} ítem{b.items.length === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {formatMoney(b.total)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatDateOnly(b.updatedAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <ActionBtn title="Descargar PDF" onClick={() => handlePdf(b)}>
                        <FileText className="h-4 w-4 text-emerald-300" />
                      </ActionBtn>
                      <ActionBtn title="Enviar por WhatsApp" onClick={() => whatsappBudget(b)}>
                        <MessageCircle className="h-4 w-4 text-green-300" />
                      </ActionBtn>
                      <ActionBtn title="Copiar a WhatsApp" onClick={() => copyBudget(b)}>
                        <ClipboardCopy className="h-4 w-4" />
                      </ActionBtn>

                      {b.status === 'borrador' && (
                        <>
                          <ActionBtn
                            title="Enviar presupuesto"
                            onClick={() =>
                              changeStatus(b, 'enviado', 'Presupuesto enviado al cliente 📤')
                            }
                          >
                            <Send className="h-4 w-4 text-sky-300" />
                          </ActionBtn>
                          <ActionBtn title="Editar" onClick={() => openEdit(b)}>
                            <Pencil className="h-4 w-4" />
                          </ActionBtn>
                        </>
                      )}

                      {b.status === 'enviado' && (
                        <>
                          <ActionBtn
                            title="Aceptar presupuesto"
                            onClick={() => changeStatus(b, 'aceptado', 'Presupuesto aceptado 🎉')}
                          >
                            <CheckCheck className="h-4 w-4 text-emerald-300" />
                          </ActionBtn>
                          <ActionBtn
                            title="Rechazar presupuesto"
                            onClick={() => changeStatus(b, 'rechazado', 'Presupuesto rechazado')}
                          >
                            <XCircle className="h-4 w-4 text-rose-300" />
                          </ActionBtn>
                          <ActionBtn title="Editar" onClick={() => openEdit(b)}>
                            <Pencil className="h-4 w-4" />
                          </ActionBtn>
                        </>
                      )}

                      {b.status === 'aceptado' && onCreateSale && (
                        b.hasSale ? (
                          <ActionBtn
                            title="Este presupuesto ya generó una venta"
                            disabled
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </ActionBtn>
                        ) : (
                          <ActionBtn
                            title="Crear venta desde este presupuesto"
                            onClick={() => onCreateSale(b.id)}
                          >
                            <ShoppingCart className="h-4 w-4 text-sky-300" />
                          </ActionBtn>
                        )
                      )}

                      {b.status === 'rechazado' && (
                        <ActionBtn title="Editar y reenviar" onClick={() => openEdit(b)}>
                          <Pencil className="h-4 w-4" />
                        </ActionBtn>
                      )}

                      <ActionBtn title="Eliminar" danger onClick={() => setDeleting(b)}>
                        <Trash2 className="h-4 w-4" />
                      </ActionBtn>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No hay presupuestos con este estado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BudgetFormModal open={formOpen} budget={editing} onClose={() => setFormOpen(false)} />

      <ConfirmModal
        open={deleting !== null}
        title="Eliminar presupuesto"
        message={
          deleting
            ? `¿Seguro que quieres eliminar el presupuesto #${deleting.number}? Esta acción no se puede deshacer.`
            : ''
        }
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </motion.div>
  )
}

function ActionBtn({
  children,
  onClick,
  title,
  danger = false,
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  title: string
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`rounded-lg p-1.5 transition-colors ${
        disabled
          ? 'cursor-not-allowed text-slate-600'
          : danger
            ? 'text-slate-400 hover:bg-rose-500/15 hover:text-rose-400'
            : 'text-slate-400 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
