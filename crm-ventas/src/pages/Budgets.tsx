import { useEffect, useMemo, useState } from 'react'
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
import ActionButton from '../components/ui/ActionButton'
import ActionsMenu, { type ActionItem } from '../components/ui/ActionsMenu'
import DetailModal from '../components/ui/DetailModal'
import Pagination from '../components/ui/Pagination'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useSalesStore } from '../store/salesStore'
import { useConfigStore } from '../store/configStore'
import { formatDateOnly, formatMoney, formatMoneyCompact } from '../utils/format'
import { BUDGET_STATUSES, BUDGET_STATUS_META } from '../utils/budgetStatus'
import { buildBudgetText, buildWhatsAppLink, TAX_RATE } from '../utils/budget'
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
  const [rejecting, setRejecting] = useState<Budget | null>(null)
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Budget | null>(null)

  const isMobile = useMediaQuery('(max-width: 767px)')

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])

  const filtered = useMemo(
    () =>
      budgets
        .filter((b) => statusFilter === 'all' || b.status === statusFilter)
        .sort((a, b) => b.number - a.number),
    [budgets, statusFilter],
  )

  // Paginación: 7 presupuestos por página
  const PAGE_SIZE = 7
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Al filtrar por estado, vuelve a la primera página
  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  // Al cambiar de página, el scroll sube al principio de la lista
  useEffect(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [safePage])

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

  // Rechazar presupuesto requiere confirmación (acción crítica)
  const handleReject = () => {
    if (!rejecting) return
    changeStatus(rejecting, 'rechazado', 'Presupuesto rechazado')
  }

  // Acciones del modal de detalle (según el estado del presupuesto)
  const buildDetailActions = (b: Budget): ActionItem[] => {
    const a: ActionItem[] = [
      {
        key: 'pdf',
        icon: <FileText className="h-4 w-4 text-emerald-300" />,
        label: 'PDF',
        onClick: () => handlePdf(b),
      },
      {
        key: 'wa',
        icon: <MessageCircle className="h-4 w-4 text-green-300" />,
        label: 'WhatsApp',
        onClick: () => whatsappBudget(b),
      },
      {
        key: 'copy',
        icon: <ClipboardCopy className="h-4 w-4" />,
        label: 'Copiar',
        onClick: () => copyBudget(b),
      },
    ]
    if (b.status === 'enviado') {
      a.push({
        key: 'accept',
        icon: <CheckCheck className="h-4 w-4 text-emerald-300" />,
        label: 'Aceptar',
        onClick: () => changeStatus(b, 'aceptado', 'Presupuesto aceptado 🎉'),
      })
      a.push({
        key: 'reject',
        icon: <XCircle className="h-4 w-4 text-rose-300" />,
        label: 'Rechazar',
        danger: true,
        onClick: () => setRejecting(b),
      })
    }
    if (b.status === 'aceptado' && onCreateSale && !b.hasSale) {
      a.push({
        key: 'sell',
        icon: <ShoppingCart className="h-4 w-4 text-sky-300" />,
        label: 'Vender',
        onClick: () => onCreateSale(b.id),
      })
    }
    a.push({
      key: 'edit',
      icon: <Pencil className="h-4 w-4" />,
      label: 'Editar',
      onClick: () => openEdit(b),
    })
    a.push({
      key: 'delete',
      icon: <Trash2 className="h-4 w-4" />,
      label: 'Eliminar',
      danger: true,
      onClick: () => setDeleting(b),
    })
    return a
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
                <th className="hidden px-4 py-3 font-medium md:table-cell">Fecha</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((b) => {
                const customerName = customerById.get(b.customerId)?.name ?? 'Sin cliente'
                // Acciones disponibles según el estado del presupuesto
                const actions: ActionItem[] = []
                actions.push({
                  key: 'pdf',
                  icon: <FileText className="h-4 w-4 text-emerald-300" />,
                  label: 'PDF',
                  onClick: () => handlePdf(b),
                })
                actions.push({
                  key: 'wa',
                  icon: <MessageCircle className="h-4 w-4 text-green-300" />,
                  label: 'WhatsApp',
                  onClick: () => whatsappBudget(b),
                })
                actions.push({
                  key: 'copy',
                  icon: <ClipboardCopy className="h-4 w-4" />,
                  label: 'Copiar',
                  onClick: () => copyBudget(b),
                })

                if (b.status === 'borrador') {
                  actions.push({
                    key: 'send',
                    icon: <Send className="h-4 w-4 text-sky-300" />,
                    label: 'Enviar',
                    onClick: () => changeStatus(b, 'enviado', 'Presupuesto enviado al cliente 📤'),
                  })
                  actions.push({
                    key: 'edit',
                    icon: <Pencil className="h-4 w-4" />,
                    label: 'Editar',
                    onClick: () => openEdit(b),
                  })
                }

                if (b.status === 'enviado') {
                  actions.push({
                    key: 'accept',
                    icon: <CheckCheck className="h-4 w-4 text-emerald-300" />,
                    label: 'Aceptar',
                    onClick: () => changeStatus(b, 'aceptado', 'Presupuesto aceptado 🎉'),
                  })
                  actions.push({
                    key: 'reject',
                    icon: <XCircle className="h-4 w-4 text-rose-300" />,
                    label: 'Rechazar',
                    danger: true,
                    onClick: () => setRejecting(b),
                  })
                  actions.push({
                    key: 'edit',
                    icon: <Pencil className="h-4 w-4" />,
                    label: 'Editar',
                    onClick: () => openEdit(b),
                  })
                }

                if (b.status === 'aceptado' && onCreateSale) {
                  if (b.hasSale) {
                    actions.push({
                      key: 'sold',
                      icon: <ShoppingCart className="h-4 w-4" />,
                      label: 'Ya vendido',
                      disabled: true,
                    })
                  } else {
                    actions.push({
                      key: 'sell',
                      icon: <ShoppingCart className="h-4 w-4 text-sky-300" />,
                      label: 'Vender',
                      onClick: () => onCreateSale(b.id),
                    })
                  }
                }

                if (b.status === 'rechazado') {
                  actions.push({
                    key: 'edit',
                    icon: <Pencil className="h-4 w-4" />,
                    label: 'Editar y reenviar',
                    onClick: () => openEdit(b),
                  })
                }

                actions.push({
                  key: 'delete',
                  icon: <Trash2 className="h-4 w-4" />,
                  label: 'Eliminar',
                  danger: true,
                  onClick: () => setDeleting(b),
                })

                return (
                  <motion.tr
                    key={b.id}
                    onClick={() => setDetail(b)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="cursor-pointer border-b border-white/5 text-slate-300 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold text-white md:text-sm">
                        #{b.number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="hidden items-center md:flex">{customerName}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-xs font-bold text-white md:hidden">
                        {(customerName[0] || '?').toUpperCase()}
                      </span>
                    </td>
                    <td className="max-w-[40px] px-4 py-3 md:max-w-none">
                      <span className="hidden items-center gap-1.5 md:flex">
                        <span className="text-lg">{b.items[0]?.emoji ?? '📄'}</span>
                        <span className="text-sm">
                          {b.items.length} ítem{b.items.length === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-white md:hidden">
                        {b.items.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="hidden text-sm font-semibold text-white md:inline">
                        {formatMoney(b.total)}
                      </span>
                      <span className="text-xs font-semibold text-white md:hidden">
                        {formatMoneyCompact(b.total)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} compact={isMobile} />
                    </td>
                    <td className="hidden px-4 py-3 text-slate-400 md:table-cell">
                      {formatDateOnly(b.updatedAt)}
                    </td>
                    <td className="px-5 py-3">
                      {isMobile ? (
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <ActionsMenu items={actions} compact />
                        </div>
                      ) : (
                        <div
                          className="flex flex-wrap justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {actions.map((a) => {
                            const { key, ...rest } = a
                            return <ActionButton key={key} {...rest} />
                          })}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
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

      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />

      <BudgetFormModal open={formOpen} budget={editing} onClose={() => setFormOpen(false)} />

      {/* Detalle del presupuesto */}
      {detail && (
        <DetailModal
          open
          title={`Presupuesto #${detail.number}`}
          subtitle={`${BUDGET_STATUS_META[detail.status].label} · ${formatDateOnly(detail.createdAt)}`}
          icon={<FileText className="h-5 w-5 text-white" />}
          customerName={customerById.get(detail.customerId)?.name ?? 'Sin cliente'}
          customerPhone={customerById.get(detail.customerId)?.phone ?? ''}
          items={detail.items.map((i) => ({
            name: i.name,
            emoji: i.emoji,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))}
          status={<StatusBadge status={detail.status} />}
          lines={[
            { label: 'Subtotal', value: formatMoney(detail.subtotal) },
            {
              label: `Impuestos (${Math.round(TAX_RATE * 100)}%)`,
              value: formatMoney(detail.tax),
            },
            { label: 'Total', value: formatMoney(detail.total), strong: true },
          ]}
          actions={buildDetailActions(detail)}
          onClose={() => setDetail(null)}
        />
      )}

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

      <ConfirmModal
        open={rejecting !== null}
        title="Rechazar presupuesto"
        message={
          rejecting
            ? `¿Seguro que quieres rechazar el presupuesto #${rejecting.number}? Esta acción no se puede deshacer.`
            : ''
        }
        onConfirm={handleReject}
        onClose={() => setRejecting(null)}
      />
    </motion.div>
  )
}

