import { useEffect, useMemo, useState } from 'react'
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
  ShoppingBag,
  Trash2,
  XCircle,
} from 'lucide-react'
import SaleFormModal from '../components/sales/SaleFormModal'
import StatusBadge from '../components/sales/StatusBadge'
import ConfirmModal from '../components/products/ConfirmModal'
import ActionButton from '../components/ui/ActionButton'
import ActionsMenu, { type ActionItem } from '../components/ui/ActionsMenu'
import DetailModal from '../components/ui/DetailModal'
import Pagination from '../components/ui/Pagination'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useSalesStore } from '../store/salesStore'
import { useConfigStore } from '../store/configStore'
import { formatDateTime, formatDateOnly, formatMoney, formatMoneyCompact } from '../utils/format'
import { SALE_STATUSES, STATUS_META } from '../utils/saleStatus'
import { saleProfit, saleTotal, saleUnits } from '../utils/sale'
import { buildReceiptText, buildWhatsAppLink, computeDiscount } from '../utils/budget'
import { generateReceiptPDF } from '../utils/documentPDF'
import type { Sale, SaleStatus } from '../types'

interface SalesProps {
  initialBudgetId?: string | null
  onBudgetConsumed?: () => void
  // Se incrementa con cada cambio de datos del store (force refresh)
  refreshKey?: number
}

export default function Sales({ initialBudgetId, onBudgetConsumed, refreshKey }: SalesProps) {
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
  const [canceling, setCanceling] = useState<Sale | null>(null)
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Sale | null>(null)

  const isMobile = useMediaQuery('(max-width: 767px)')

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
  }, [sales, query, status, fromDate, toDate, refreshKey])

  // Paginación: 7 ventas por página
  const PAGE_SIZE = 7
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Al buscar o filtrar, vuelve a la primera página
  useEffect(() => {
    setPage(1)
  }, [query, status, fromDate, toDate])

  // Al cambiar de página, el scroll sube al principio de la lista
  useEffect(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [safePage])

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
    try {
      removeSale(deleting.id)
      toast('Venta eliminada (stock restaurado)', { icon: '🗑️' })
    } catch (error) {
      console.error('[electro-crm] Error al eliminar la venta:', error)
      toast.error('No se pudo eliminar la venta.')
    }
  }

  // Cancelar venta requiere confirmación (acción crítica: restaura stock)
  const handleCancel = () => {
    if (!canceling) return
    try {
      changeStatus(canceling, 'cancelado', 'Venta cancelada 🚫')
    } catch (error) {
      console.error('[electro-crm] Error al cancelar la venta:', error)
      toast.error('No se pudo cancelar la venta.')
    }
  }

  // Acciones del modal de detalle (según el estado de la venta)
  const buildSaleDetailActions = (sale: Sale): ActionItem[] => {
    const a: ActionItem[] = []
    if (sale.status === 'pendiente_pago') {
      a.push({
        key: 'charge',
        icon: <Banknote className="h-4 w-4 text-emerald-300" />,
        label: 'Cobrar',
        onClick: () => changeStatus(sale, 'pagado', '💰 Cobro registrado. La venta está pagada.'),
      })
    }
    if (sale.status === 'pagado' || sale.status === 'entregado') {
      a.push({
        key: 'receipt',
        icon: <FileText className="h-4 w-4 text-emerald-300" />,
        label: 'Recibo PDF',
        onClick: () => handleReceiptPdf(sale),
      })
      a.push({
        key: 'copy',
        icon: <ClipboardCopy className="h-4 w-4 text-secondary" />,
        label: 'Copiar',
        onClick: () => copyReceipt(sale),
      })
      a.push({
        key: 'wa',
        icon: <MessageCircle className="h-4 w-4 text-green-300" />,
        label: 'WhatsApp',
        onClick: () => handleReceiptWhatsApp(sale),
      })
    }
    if (sale.status === 'pagado') {
      a.push({
        key: 'deliver',
        icon: <PackageCheck className="h-4 w-4 text-sky-300" />,
        label: 'Entregar',
        onClick: () => handleDeliver(sale),
      })
    }
    a.push({
      key: 'edit',
      icon: <Pencil className="h-4 w-4" />,
      label: 'Editar',
      onClick: () => openEdit(sale),
    })
    if (sale.status !== 'cancelado') {
      a.push({
        key: 'cancel',
        icon: <XCircle className="h-4 w-4 text-rose-300" />,
        label: 'Cancelar',
        danger: true,
        onClick: () => setCanceling(sale),
      })
    }
    a.push({
      key: 'delete',
      icon: <Trash2 className="h-4 w-4" />,
      label: 'Eliminar',
      danger: true,
      onClick: () => setDeleting(sale),
    })
    return a
  }

  // Genera el recibo PDF asignando el folio si hace falta
  const generateReceiptFor = async (sale: Sale, silent = false) => {
    const config = useConfigStore.getState().config
    let number = sale.receiptNumber
    if (!number) {
      number = useConfigStore.getState().nextReceiptNumber()
      setReceiptNumber(sale.id, number)
    }
    try {
      await generateReceiptPDF(sale, customerById.get(sale.customerId), config, number)
      if (!silent) toast.success('Recibo PDF generado 🧾')
      return true
    } catch {
      if (!silent) toast.error('No se pudo generar el recibo')
      return false
    }
  }

  // Recibo PDF manual (botón de la fila / detalle)
  const handleReceiptPdf = (sale: Sale) => generateReceiptFor(sale)

  // Marca como entregado y genera el recibo PDF automáticamente
  const handleDeliver = async (sale: Sale) => {
    setSaleStatus(sale.id, 'entregado')
    toast.success('📦 Venta entregada. El recibo PDF se ha generado automáticamente.')
    await generateReceiptFor(sale, true)
  }

  // Texto unificado del recibo: '📋 Copiar' y '📤 WhatsApp' generan el MISMO mensaje
  const receiptTextFor = (sale: Sale): string => {
    const config = useConfigStore.getState().config
    const customer = customerById.get(sale.customerId)
    const number = sale.receiptNumber ?? config.receiptCounter
    const includeTax = sale.includeTax ?? true
    const taxRate = sale.taxRate ?? config.taxRate ?? 21
    const subtotal = saleTotal(sale)
    const tax = includeTax ? subtotal * (taxRate / 100) : 0
    const discount = computeDiscount(subtotal, sale.discountType, sale.discountValue)
    const shipping = sale.shippingCost && sale.shippingCost > 0 ? sale.shippingCost : undefined
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
      total: subtotal - discount + tax + (shipping ?? 0),
      includeTax,
      taxRate,
      discount: discount > 0 ? discount : undefined,
      shipping,
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
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por producto…"
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
          />
        </div>

        <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | SaleStatus)}
            className="bg-transparent text-sm text-primary focus:outline-none [&>option]:bg-panel"
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
          <CalendarRange className="h-4 w-4 shrink-0 text-muted" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-transparent text-sm text-primary focus:outline-none [color-scheme:dark]"
          />
          <span className="text-muted">→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-transparent text-sm text-primary focus:outline-none [color-scheme:dark]"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="glass glass-hover flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium text-secondary"
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

      <p className="text-xs text-muted">
        {filtered.length} ventas · Total {formatMoney(totals.total)} · Ganancia{' '}
        <span className="text-emerald-400">{formatMoney(totals.profit)}</span>
        {hasFilters && ' (filtrado)'}
      </p>

      {/* Tabla del historial completo */}
      <div className="glass overflow-hidden">
        <div className="w-full overflow-x-hidden">
          <table className="data-table w-full text-left text-sm md:min-w-full">
            <thead>
              <tr className="border-b border-app bg-card text-xs text-muted">
                <th className="px-5 py-3 font-medium">Productos</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Cant.</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Ganancia</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((sale) => {
                const customer = customerById.get(sale.customerId)
                const customerName = customer?.name ?? 'Sin cliente'
                const units = saleUnits(sale)
                const first = sale.items[0]

                // Acciones disponibles según el estado de la venta
                const actions: ActionItem[] = []
                if (sale.status === 'pendiente_pago') {
                  actions.push({
                    key: 'charge',
                    icon: <Banknote className="h-4 w-4 text-emerald-300" />,
                    label: 'Cobrar',
                    onClick: () => changeStatus(sale, 'pagado', '💰 Cobro registrado. La venta está pagada.'),
                  })
                }
                if (sale.status === 'pagado' || sale.status === 'entregado') {
                  actions.push({
                    key: 'receipt',
                    icon: <FileText className="h-4 w-4 text-emerald-300" />,
                    label: 'Recibo PDF',
                    onClick: () => handleReceiptPdf(sale),
                  })
                  actions.push({
                    key: 'copy',
                    icon: <ClipboardCopy className="h-4 w-4 text-secondary" />,
                    label: 'Copiar',
                    onClick: () => copyReceipt(sale),
                  })
                  actions.push({
                    key: 'wa',
                    icon: <MessageCircle className="h-4 w-4 text-green-300" />,
                    label: 'WhatsApp',
                    onClick: () => handleReceiptWhatsApp(sale),
                  })
                }
                if (sale.status === 'pagado') {
                  actions.push({
                    key: 'deliver',
                    icon: <PackageCheck className="h-4 w-4 text-sky-300" />,
                    label: 'Entregar',
                    onClick: () => handleDeliver(sale),
                  })
                }
                actions.push({
                  key: 'edit',
                  icon: <Pencil className="h-4 w-4" />,
                  label: 'Editar',
                  onClick: () => openEdit(sale),
                })
                if (sale.status !== 'cancelado') {
                  actions.push({
                    key: 'cancel',
                    icon: <XCircle className="h-4 w-4 text-rose-300" />,
                    label: 'Cancelar',
                    danger: true,
                    onClick: () => setCanceling(sale),
                  })
                }
                actions.push({
                  key: 'delete',
                  icon: <Trash2 className="h-4 w-4" />,
                  label: 'Eliminar',
                  danger: true,
                  onClick: () => setDeleting(sale),
                })

                return (
                  <motion.tr
                    key={sale.id}
                    onClick={() => setDetail(sale)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="cursor-pointer border-b border-app text-secondary last:border-0 hover:bg-card"
                  >
                    <td className="min-w-[100px] max-w-[150px] px-5 py-3 md:max-w-none">
                      <span className="hidden items-center gap-2 md:flex">
                        <span className="text-lg">{first?.emoji ?? '📦'}</span>
                        <span className="truncate font-medium text-white">
                          {first?.name ?? 'Producto'}
                        </span>
                        {sale.internalNotes && (
                          <span
                            title={`Nota interna: ${sale.internalNotes}`}
                            className="cursor-help text-xs text-amber-300"
                          >
                            📝
                          </span>
                        )}
                        {sale.items.length > 1 && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-secondary">
                            +{sale.items.length - 1}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1 md:hidden">
                        <span className="text-lg">{first?.emoji ?? '📦'}</span>
                        {sale.internalNotes && (
                          <span
                            title={`Nota interna: ${sale.internalNotes}`}
                            className="cursor-help text-xs text-amber-300"
                          >
                            📝
                          </span>
                        )}
                        {sale.items.length > 1 && (
                          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
                            +{sale.items.length - 1}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="min-w-[100px] max-w-[150px] px-4 py-3 md:max-w-none">
                      <span className="hidden truncate md:block">{customerName}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-xs font-bold text-white md:hidden">
                        {(customerName[0] || '?').toUpperCase()}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-secondary md:table-cell">
                      {formatDateTime(sale.date)}
                    </td>
                    <td className="min-w-[80px] px-4 py-3">
                      <StatusBadge status={sale.status} compact={isMobile} />
                    </td>
                    <td className="min-w-[60px] px-4 py-3 text-xs md:text-sm">{units}</td>
                    <td className="min-w-[80px] px-4 py-3 text-right text-xs md:text-sm">
                      <span className="hidden font-semibold text-white md:inline">
                        {formatMoney(saleTotal(sale))}
                      </span>
                      <span className="font-semibold text-white md:hidden">
                        {formatMoneyCompact(saleTotal(sale))}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-right text-xs font-semibold text-emerald-400 md:table-cell md:text-sm">
                      {formatMoney(saleProfit(sale))}
                    </td>
                    <td className="w-[60px] px-5 py-3 text-center">
                      {isMobile ? (
                        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                          <ActionsMenu items={actions} compact />
                        </div>
                      ) : (
                        <div
                          className="flex flex-wrap justify-center gap-1.5"
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
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    No hay ventas que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />

      {/* Formulario crear / editar (acepta un presupuesto inicial) */}
      <SaleFormModal
        open={formOpen}
        sale={editing}
        initialBudgetId={initialBudgetId ?? undefined}
        onClose={closeModal}
      />

      {/* Detalle de la venta */}
      {detail && (
        <DetailModal
          open
          title="Detalle de venta"
          subtitle={`${STATUS_META[detail.status].label} · ${formatDateTime(detail.date)}`}
          icon={<ShoppingBag className="h-5 w-5 text-white" />}
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
            {
              label: `Subtotal (${saleUnits(detail)} artículos)`,
              value: formatMoney(saleTotal(detail)),
            },
            { label: 'Ganancia', value: formatMoney(saleProfit(detail)), accent: true },
            { label: 'Total', value: formatMoney(saleTotal(detail)), strong: true },
          ]}
          actions={buildSaleDetailActions(detail)}
          onClose={() => setDetail(null)}
        />
      )}

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

      <ConfirmModal
        open={canceling !== null}
        title="Cancelar venta"
        message={
          canceling
            ? `¿Seguro que quieres cancelar esta venta de ${saleUnits(canceling)} unidad(es)? El stock se restaurará.`
            : ''
        }
        onConfirm={handleCancel}
        onClose={() => setCanceling(null)}
      />
    </motion.div>
  )
}

