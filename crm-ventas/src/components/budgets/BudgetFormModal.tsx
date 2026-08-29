import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ClipboardCopy,
  FileText,
  MessageCircle,
  Minus,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { useConfigStore } from '../../store/configStore'
import { formatMoney, formatDateOnly } from '../../utils/format'
import { budgetTotals, buildBudgetText, buildWhatsAppLink, TAX_RATE } from '../../utils/budget'
import { generateDocumentPDF } from '../../utils/documentPDF'
import CustomerFormModal from '../customers/CustomerFormModal'
import type { Customer, Product } from '../../types'

interface CartLine {
  productId: string
  quantity: number
}

interface BudgetFormModalProps {
  open: boolean
  budget?: import('../../types').Budget | null
  onClose: () => void
}

export default function BudgetFormModal({ open, budget, onClose }: BudgetFormModalProps) {
  const products = useSalesStore((s) => s.products)
  const customers = useSalesStore((s) => s.customers)
  const saveBudget = useSalesStore((s) => s.saveBudget)

  const [customerId, setCustomerId] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [showProducts, setShowProducts] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')
  const [showCustomers, setShowCustomers] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)

  // Carga los datos al abrir
  useEffect(() => {
    if (!open) return
    if (budget) {
      setCustomerId(budget.customerId)
      setCart(budget.items.map((i) => ({ productId: i.productId, quantity: i.quantity })))
    } else {
      setCustomerId('')
      setCart([])
    }
    setProductQuery('')
    setShowProducts(false)
    setCustomerQuery('')
    setShowCustomers(false)
    setCustomerModalOpen(false)
  }, [open, budget])

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const productResults = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (!q) return []
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6)
  }, [productQuery, products])

  const customerResults = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers.slice(0, 6)
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 6)
  }, [customerQuery, customers])

  const addProduct = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id)
      if (existing) {
        return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { productId: p.id, quantity: 1 }]
    })
    setProductQuery('')
    setShowProducts(false)
  }

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l,
        )
        .filter((l) => l.quantity > 0),
    )
  }

  const removeLine = (productId: string) =>
    setCart((prev) => prev.filter((l) => l.productId !== productId))

  const lines = useMemo(
    () =>
      cart
        .map((l) => ({ product: productById.get(l.productId), qty: l.quantity }))
        .filter((l): l is { product: Product; qty: number } => Boolean(l.product)),
    [cart, productById],
  )

  const { subtotal, tax, total } = budgetTotals(lines.map((l) => ({ unitPrice: l.product.price, quantity: l.qty })))
  const customer = customerId ? customerById.get(customerId) : undefined

  const selectedCustomerName = customer?.name ?? 'Sin cliente'

  // Cliente creado/actualizado desde el modal de cliente → se selecciona automáticamente
  // y se cierra el dropdown (el campo muestra su nombre)
  const handleCustomerSaved = (created: Customer) => {
    setCustomerId(created.id)
    setCustomerQuery('')
    setShowCustomers(false)
  }

  const persist = (status: 'borrador' | 'enviado') => {
    if (lines.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }
    if (!customerId) {
      toast.error('Selecciona o crea un cliente')
      return
    }
    saveBudget({
      id: budget?.id,
      customerId,
      items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
      status,
    })
    toast.success(
      status === 'borrador' ? 'Presupuesto guardado como borrador 💾' : 'Presupuesto enviado 📤',
    )
    onClose()
  }

  // Texto unificado: '📋 Copiar' y '📤 WhatsApp' generan EXACTAMENTE el mismo mensaje
  const buildCurrentText = (): string => {
    const items = currentItems()
    const { subtotal, tax, total } = budgetTotals(items)
    return buildBudgetText({
      numberLabel: budget ? String(budget.number) : 'NUEVO',
      customerName: selectedCustomerName,
      date: formatDateOnly(budget?.createdAt ?? new Date().toISOString()),
      items,
      subtotal,
      tax,
      total,
      footer: useConfigStore.getState().config.footer,
    })
  }

  const copyToWhatsApp = async () => {
    if (lines.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }
    try {
      await navigator.clipboard.writeText(buildCurrentText())
      toast.success('Presupuesto copiado al portapapeles 📋')
    } catch {
      toast.error('No se pudo copiar el texto')
    }
  }

  const currentItems = () =>
    lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      emoji: l.product.emoji,
      quantity: l.qty,
      unitPrice: l.product.price,
    }))

  // PDF profesional con los datos de la empresa (Configuración)
  const handlePdf = async () => {
    if (lines.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }
    const config = useConfigStore.getState().config
    const items = currentItems()
    const { subtotal, tax, total } = budgetTotals(items)
    const number = budget?.number ?? config.budgetCounter
    try {
      await generateDocumentPDF({
        type: 'PRESUPUESTO',
        number,
        customerName: selectedCustomerName,
        customerPhone: customer?.phone ?? '',
        date: formatDateOnly(new Date().toISOString()),
        lines: items.map((i) => ({
          name: `${i.emoji || ''} ${i.name}`.trim(),
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        subtotal,
        tax,
        total,
        config,
      })
      toast.success('PDF generado 📄')
    } catch {
      toast.error('No se pudo generar el PDF')
    }
  }

  // Link de WhatsApp con el MISMO texto que '📋 Copiar' (el PDF se adjunta en WhatsApp Web)
  const handleWhatsApp = () => {
    if (lines.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }
    const config = useConfigStore.getState().config
    const phone = customer?.phone || config.phone
    window.open(buildWhatsAppLink(phone, buildCurrentText()), '_blank')
    toast.success('Abriendo WhatsApp…')
  }

  return (
    <>
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
              className="glass-strong my-4 w-[95%] max-h-[90vh] max-w-lg overflow-y-auto p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 shadow-lg shadow-violet-500/30">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {budget ? `Editar presupuesto #${budget.number}` : 'Nuevo presupuesto'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Impuestos del {Math.round(TAX_RATE * 100)}% incluidos
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

              {/* Cliente: buscador + crear nuevo */}
              <div className="relative mb-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Cliente *
                </label>
                <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    value={customer ? customer.name : customerQuery}
                    onChange={(e) => {
                      // Si el usuario escribe, deselecciona el cliente actual (está buscando otro)
                      setCustomerQuery(e.target.value)
                      setCustomerId('')
                      setShowCustomers(true)
                    }}
                    onFocus={() => setShowCustomers(true)}
                    placeholder="Buscar cliente…"
                    className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                {showCustomers && (
                  <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur-md">
                    {customerResults.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          setCustomerId(c.id)
                          setCustomerQuery('')
                          setShowCustomers(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-white/10"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                          {c.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <span className="text-xs text-slate-500">{c.phone}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomers(false)
                        setCustomerModalOpen(true)
                      }}
                      className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2 text-left text-sm font-medium text-sky-300 transition-colors hover:bg-white/10"
                    >
                      <UserPlus className="h-4 w-4" />
                      Crear cliente nuevo…
                    </button>
                  </div>
                )}
              </div>

              {/* Buscador de productos */}
              <div className="relative mb-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Agregar producto
                </label>
                <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    value={productQuery}
                    onChange={(e) => {
                      setProductQuery(e.target.value)
                      setShowProducts(true)
                    }}
                    onFocus={() => setShowProducts(true)}
                    placeholder="Buscar por nombre…"
                    className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                {showProducts && productResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur-md">
                    {productResults.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => addProduct(p)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-white/10"
                      >
                        <span className="text-lg">{p.emoji}</span>
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-slate-400">
                          {formatMoney(p.price)} · {p.stock} u.
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Carrito */}
              {lines.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {lines.map((l) => (
                    <motion.div
                      key={l.product.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
                    >
                      <span className="text-lg">{l.product.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{l.product.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatMoney(l.product.price)} / u.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => changeQty(l.product.id, -1)}
                          className="rounded-lg bg-white/[0.06] p-1 text-slate-300 hover:bg-white/[0.12]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-white">
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(l.product.id, 1)}
                          className="rounded-lg bg-white/[0.06] p-1 text-slate-300 hover:bg-white/[0.12]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="w-20 text-right text-sm font-semibold text-white">
                        {formatMoney(l.product.price * l.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(l.product.id)}
                        className="rounded-lg p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="mb-4 rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
                  Carrito vacío. Busca un producto para agregarlo.
                </p>
              )}

              {/* Resumen con impuestos */}
              <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">{formatMoney(subtotal)}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-slate-400">
                  <span>Impuestos ({Math.round(TAX_RATE * 100)}%)</span>
                  <span className="font-semibold text-slate-300">{formatMoney(tax)}</span>
                </div>
                <div className="mt-1.5 flex justify-between border-t border-white/10 pt-1.5 text-slate-400">
                  <span>Total</span>
                  <span className="font-bold text-emerald-400">{formatMoney(total)}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={handlePdf}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 active:scale-95"
                >
                  <FileText className="h-4 w-4" />
                  📄 Generar PDF
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-3 py-2.5 text-xs font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:brightness-110 active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  📤 Enviar por WhatsApp
                </button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  onClick={copyToWhatsApp}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:bg-white/[0.1] active:scale-95"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  📋 Copiar texto
                </button>
                <button
                  onClick={() => persist('borrador')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-200 transition-all hover:bg-amber-500/20 active:scale-95"
                >
                  💾 Guardar borrador
                </button>
                <button
                  onClick={() => persist('enviado')}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-3 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-95"
                >
                  <Send className="h-4 w-4" />
                  📤 Enviar presupuesto
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>

    {/* Modal de cliente: se renderiza fuera del formulario animado para que el overlay
        cubra toda la pantalla. Al guardar selecciona el cliente y cierra el dropdown. */}
    <CustomerFormModal
      open={customerModalOpen}
      customer={null}
      onClose={() => setCustomerModalOpen(false)}
      onSaved={handleCustomerSaved}
    />
    </>
  )
}
