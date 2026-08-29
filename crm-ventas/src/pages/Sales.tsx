import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Banknote,
  CalendarRange,
  ClipboardCopy,
  FileText,
  MessageCircle,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import SaleFormModal from '../components/sales/SaleFormModal'
import StatusBadge from '../components/sales/StatusBadge'
import ConfirmModal from '../components/products/ConfirmModal'
import { useSalesStore } from '../store/salesStore'
import { useConfigStore } from '../store/configStore'
import { formatDateTime, formatDateOnly, formatMoney } from '../utils/format'
import { SALE_STATUSES, STATUS_META } from '../utils/saleStatus'
import { saleProfit, saleTotal, saleUnits } from '../utils/sale'
import { buildReceiptText, buildWhatsAppLink, TAX_RATE } from '../utils/budget'
import { generateReceiptPDF } from '../utils/documentPDF'
import type { Sale, SaleStatus } from '../types'

interface SalesProps {
  initialBudgetId?: string | null
  onBudgetConsumed?: () => void
}

export default function Sales({ initialBudgetId, onBudgetConsumed }: SalesProps) {
  const sales = useSalesStore((s) => s.sales)
  const customers = useSalesStore((s) => s.customers)
  const removeSale = useSalesStore((s) => s.removeSale)
  const setSaleStatus = useSalesStore((s) => s.setSaleStatus)
  const setReceiptNumber = useSalesStore((s) => s.setReceiptNumber)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | SaleStatus>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Sale | null>(null)
  const [deleting, setDeleting] = useState<Sale | null>(null)

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])

  // Si el App pide crear una venta desde un presupuesto, abre el modal
  useEffect(() => {
    if (initialBudgetId) {
      setEditing(null)
      setFormOpen(true)
    }
  }, [initialBudgetId])

  const closeModal = () => {
    setFormOpen(false)
    onBudgetConsumed?.()
  }

  const hasFilters = query.trim() !== '' || status !== 'all' || fromDate !== '' || toDate !== ''

  // Búsqueda por producto + filtros por estado y rango de fechas
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sales
      .filter((s) => {
        const matchesQuery = !q || s.items.some((i) => i.name.toLowerCase().includes(q))
        const matchesStatus = status === 'all' || s.status === status
        const day = s.date.slice(0, 10)
        const matchesFrom = !fromDate || day >= fromDate
        const matchesTo = !toDate || day <= toDate
        return matchesQuery && matchesStatus && matchesFrom && matchesTo
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [sales, query, status, fromDate, toDate])

  const totals = useMemo(() => {
    let total = 0
    let profit = 0
    for (const s of filtered) {
      total += saleTotal(s)
      profit += saleProfit(s)
    }
    return { total, profit }
  }, [filtered])

  const clearFilters = () => {
    setQuery('')
    setStatus('all')
    setFromDate('')
    setToDate('')
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (s: Sale) => {
    setEditing(s)
    setFormOpen(true)
  }

  const changeStatus = (sale: Sale, next: SaleStatus, message: string) => {
    setSaleStatus(sale.id, next)
    toast.success(message)
  }

  const handleDelete = () => {
    if (!deleting) return
    removeSale(deleting.id)
    toast('Venta eliminada (stock restaurado)', { icon: '🗑️' })
  }

  // Recibo PDF: usa el folio de la configuración y lo incrementa automáticamente
  const handleReceiptPdf = async (sale: Sale) => {
    const config = useConfigStore.getState().config
    let number = sale.receiptNumber
    if (!number) {
      number = useConfigStore.getState().nextReceiptNumber()
      setReceiptNumber(sale.id, number)
    }
    try {
      await generateReceiptPDF(sale, customerById.get(sale.customerId), config, number)
      toast.success('Recibo PDF generado 🧾')
    } catch {
      toast.error('No se pudo generar el recibo')
    }
  }

  // Texto unificado del recibo: '📋 Copiar' y '📤 WhatsApp' generan el MISMO mensaje
  const receiptTextFor = (sale: Sale): string => {
    const config = useConfigStore.getState().config
    const customer = customerById.get(sale.customerId)
    const number = sale.receiptNumber ?? config.receiptCounter
    const subtotal = saleTotal(sale)
    const tax = subtotal * TAX_RATE
    return buildReceiptText({
      numberLabel: String(number),
      customerName: customer?.name ?? 'Sin cliente',
      date: formatDateOnly(sale.date),
      items: sale.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        emoji: i.emoji,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      subtotal,
      tax,
      total: subtotal + tax,
      footer: config.footer,
    })
  }

  const copyReceipt = async (sale: Sale) => {
    try {
      await navigator.clipboard.writeText(receiptTextFor(sale))
      toast.success('Recibo copiado al portapapeles 📋')
    } catch {
      toast.error('No se pudo copiar el texto')
    }
  }

  const handleReceiptWhatsApp = (sale: Sale) => {
    const customer = customerById.get(sale.customerId)
    if (!customer?.phone) {
      toast.error('El cliente no tiene teléfono registrado')
      return
    }
    window.open(buildWhatsAppLink(customer.phone, receiptTextFor(sale)), '_blank')
    toast.success('Abriendo WhatsApp…')
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
        <div className="glass flex min-w-[200px] flex-1 items-center gap-2 rounded-xl px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por producto…"
            className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | SaleStatus)}
            className="bg-transparent text-sm text-slate-200 focus:outline-none [&>option]:bg-slate-900"
          >
            <option value="all">Todos los estados</option>
            {SALE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>

        <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
          <CalendarRange className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-transparent text-sm text-slate-200 focus:outline-none [color-scheme:dark]"
          />
          <span className="text-slate-500">→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-transparent text-sm text-slate-200 focus:outline-none [color-scheme:dark]"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="glass glass-hover flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-300"
          >
            <XCircle className="h-4 w-4" />
            Limpiar
          </button>
        )}

        <button
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-95 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nueva venta
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} ventas · Total {formatMoney(totals.total)} · Ganancia{' '}
        <span className="text-emerald-400">{formatMoney(totals.profit)}</span>
        {hasFilters && ' (filtrado)'}
      </p>

      {/* Tabla del historial completo */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">Productos</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Cant.</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Ganancia</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sale) => {
                const customer = customerById.get(sale.customerId)
                const units = saleUnits(sale)
                const first = sale.items[0]
                return (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="border-b border-white/5 text-slate-300 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3">
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
                    <td className="px-4 py-3">{customer?.name ?? 'Sin cliente'}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDateTime(sale.date)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="px-4 py-3">{units}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      {formatMoney(saleTotal(sale))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                      {formatMoney(saleProfit(sale))}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {sale.status === 'pendiente_pago' && (
                          <ActionBtn
                            title="Registrar cobro"
                            onClick={() =>
                              changeStatus(sale, 'pagado', 'Cobro registrado 💰')
                            }
                          >
                            <Banknote className="h-4 w-4 text-emerald-300" />
                          </ActionBtn>
                        )}
                        {sale.status === 'pagado' && (
                          <>
                            <ActionBtn
                              title="Recibo PDF"
                              onClick={() => handleReceiptPdf(sale)}
                            >
                              <FileText className="h-4 w-4 text-emerald-300" />
                            </ActionBtn>
                            <ActionBtn
                              title="Copiar texto del recibo"
                              onClick={() => copyReceipt(sale)}
                            >
                              <ClipboardCopy className="h-4 w-4 text-slate-300" />
                            </ActionBtn>
                            <ActionBtn
                              title="Enviar recibo por WhatsApp"
                              onClick={() => handleReceiptWhatsApp(sale)}
                            >
                              <MessageCircle className="h-4 w-4 text-green-300" />
                            </ActionBtn>
                            <ActionBtn
                              title="Marcar entregado"
                              onClick={() =>
                                changeStatus(sale, 'entregado', 'Venta marcada como Entregada 📦')
                              }
                            >
                              <PackageCheck className="h-4 w-4 text-sky-300" />
                            </ActionBtn>
                          </>
                        )}
                        <ActionBtn title="Editar venta" onClick={() => openEdit(sale)}>
                          <Pencil className="h-4 w-4" />
                        </ActionBtn>
                        <ActionBtn
                          title="Eliminar venta"
                          danger
                          onClick={() => setDeleting(sale)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionBtn>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No hay ventas que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulario crear / editar (acepta un presupuesto inicial) */}
      <SaleFormModal
        open={formOpen}
        sale={editing}
        initialBudgetId={initialBudgetId ?? undefined}
        onClose={closeModal}
      />

      {/* Confirmación de eliminación */}
      <ConfirmModal
        open={deleting !== null}
        title="Eliminar venta"
        message={
          deleting
            ? `¿Seguro que quieres eliminar esta venta de ${saleUnits(deleting)} unidad(es)? El stock de sus productos se restaurará.`
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
}: {
  children: ReactNode
  onClick: () => void
  title: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-lg p-1.5 text-slate-400 transition-colors ${
        danger ? 'hover:bg-rose-500/15 hover:text-rose-400' : 'hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
