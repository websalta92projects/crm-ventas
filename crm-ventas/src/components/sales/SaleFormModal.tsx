import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { formatMoney, todayInputValue, toDateInputValue } from '../../utils/format'
import { SALE_STATUSES, STATUS_META } from '../../utils/saleStatus'
import type { Product, Sale, SaleStatus } from '../../types'

interface CartLine {
  productId: string
  quantity: number
}

interface SaleFormModalProps {
  open: boolean
  sale?: Sale | null
  initialBudgetId?: string
  onClose: () => void
}

export default function SaleFormModal({
  open,
  sale,
  initialBudgetId,
  onClose,
}: SaleFormModalProps) {
  const products = useSalesStore((s) => s.products)
  const customers = useSalesStore((s) => s.customers)
  const budgets = useSalesStore((s) => s.budgets)
  const saveSale = useSalesStore((s) => s.saveSale)

  const [budgetId, setBudgetId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [status, setStatus] = useState<SaleStatus>('pendiente_pago')
  const [date, setDate] = useState(todayInputValue())
  const [cart, setCart] = useState<CartLine[]>([])
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)

  const isEditing = Boolean(sale)

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])

  // Presupuestos listos para convertirse en venta (Enviado o Aceptado y sin venta previa)
  const convertibleBudgets = useMemo(
    () =>
      budgets
        .filter(
          (b) => (b.status === 'enviado' || b.status === 'aceptado') && !b.hasSale,
        )
        .sort((a, b) => b.number - a.number),
    [budgets],
  )

  // Carga los datos al abrir
  useEffect(() => {
    if (!open) return

    if (sale) {
      setBudgetId(sale.budgetId ?? '')
      setCustomerId(sale.customerId)
      setStatus(sale.status)
      setDate(toDateInputValue(sale.date))
      setCart(sale.items.map((i) => ({ productId: i.productId, quantity: i.quantity })))
    } else {
      setCustomerId('')
      setStatus('pendiente_pago')
      setDate(todayInputValue())
      setCart([])
      setBudgetId(initialBudgetId ?? '')
      if (initialBudgetId) {
        const b = budgets.find((x) => x.id === initialBudgetId)
        if (b) {
          setCustomerId(b.customerId)
          setCart(b.items.map((i) => ({ productId: i.productId, quantity: i.quantity })))
        }
      }
    }
    setQuery('')
    setShowResults(false)
  }, [open, sale, initialBudgetId, budgets])

  const productResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6)
  }, [query, products])

  const handleSelectBudget = (id: string) => {
    setBudgetId(id)
    if (!id) return
    const b = budgets.find((x) => x.id === id)
    if (b) {
      setCustomerId(b.customerId)
      setCart(b.items.map((i) => ({ productId: i.productId, quantity: i.quantity })))
    }
  }

  const addProduct = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id)
      if (existing) {
        return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { productId: p.id, quantity: 1 }]
    })
    setQuery('')
    setShowResults(false)
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

  // Permite teclear una cantidad exacta en el input del carrito
  const setQty = (productId: string, quantity: number) => {
    const q = Math.floor(quantity)
    if (!Number.isFinite(q)) return
    setCart((prev) =>
      q <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity: q } : l)),
    )
  }

  const removeLine = (productId: string) =>
    setCart((prev) => prev.filter((l) => l.productId !== productId))

  // Líneas resueltas con el producto
  const lines = useMemo(
    () =>
      cart
        .map((l) => ({ product: productById.get(l.productId), qty: l.quantity }))
        .filter((l): l is { product: Product; qty: number } => Boolean(l.product)),
    [cart, productById],
  )

  const subtotal = lines.reduce((acc, l) => acc + l.product.price * l.qty, 0)
  const totalItems = lines.reduce((acc, l) => acc + l.qty, 0)

  // Validación de stock (considera la venta existente en edición)
  const stockErrors = useMemo(() => {
    const errs: string[] = []
    for (const l of lines) {
      const existingQty = sale
        ? sale.items.find((i) => i.productId === l.product.id)?.quantity ?? 0
        : 0
      const available = l.product.stock + (isEditing ? existingQty : 0)
      if (l.qty < 1) errs.push(`${l.product.name}: cantidad inválida`)
      else if (l.qty > available) errs.push(`${l.product.name}: solo hay ${available} en stock`)
    }
    return errs
  }, [lines, sale, isEditing])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (lines.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }
    if (stockErrors.length > 0) {
      toast.error(stockErrors[0])
      return
    }
    if (!date) {
      toast.error('Indica la fecha de la venta')
      return
    }

    saveSale({
      id: sale?.id,
      items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
      customerId,
      status,
      date: new Date(`${date}T12:00:00`).toISOString(),
      budgetId: budgetId || undefined,
    })
    toast.success(
      sale
        ? 'Venta actualizada ✅'
        : budgetId
          ? 'Venta creada desde presupuesto 🎉'
          : '¡Venta rápida registrada! 🎉',
    )
    onClose()
  }

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
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="glass-strong my-4 w-[95%] max-h-[90vh] max-w-lg overflow-y-auto p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 shadow-lg shadow-violet-500/30">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {sale
                        ? 'Editar venta'
                        : budgetId
                          ? 'Venta desde presupuesto'
                          : 'Venta rápida'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      El stock se descuenta al guardar · estado inicial: Pendiente de pago
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Selector de presupuesto (solo al crear) */}
              {!sale && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Origen de la venta
                  </label>
                  <select
                    value={budgetId}
                    onChange={(e) => handleSelectBudget(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
                  >
                    <option value="" className="bg-slate-900">
                      ⚡ Venta rápida (sin presupuesto)
                    </option>
                    {convertibleBudgets.map((b) => (
                      <option key={b.id} value={b.id} className="bg-slate-900">
                        #{b.number} — {customerById.get(b.customerId)?.name ?? 'Sin cliente'} —{' '}
                        {formatMoney(b.total)}
                      </option>
                    ))}
                  </select>
                  {budgetId && (
                    <p className="mt-1 text-[11px] text-emerald-400">
                      Al crear la venta, el presupuesto #
                      {budgets.find((b) => b.id === budgetId)?.number} pasará a «Aceptado».
                    </p>
                  )}
                </div>
              )}

              {/* Buscador de productos (agregar al carrito) */}
              <div className="relative mb-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Agregar producto
                </label>
                <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setShowResults(true)
                    }}
                    onFocus={() => setShowResults(true)}
                    placeholder="Buscar por nombre…"
                    className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                {showResults && productResults.length > 0 && (
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
                <div className="mb-4 max-h-[300px] space-y-2 overflow-y-auto pr-1">
                  <p className="text-xs font-medium text-slate-400">
                    Carrito · {totalItems} artículo{totalItems === 1 ? '' : 's'}
                  </p>
                  {lines.map((l) => (
                    <motion.div
                      key={l.product.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 sm:gap-3"
                    >
                      <span className="text-lg">{l.product.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{l.product.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatMoney(l.product.price)} / u.
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeQty(l.product.id, -1)}
                          title="Disminuir cantidad"
                          aria-label="Disminuir cantidad"
                          className="flex h-[44px] w-[44px] items-center justify-center rounded-lg bg-white/[0.06] text-slate-300 transition-colors hover:bg-white/[0.12] active:scale-95"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={l.qty}
                          onChange={(e) => setQty(l.product.id, Number(e.target.value))}
                          aria-label={`Cantidad de ${l.product.name}`}
                          className="h-[44px] w-14 rounded-lg border border-white/10 bg-white/[0.06] text-center text-sm font-semibold text-white outline-none transition-colors focus:border-violet-400/60"
                        />
                        <button
                          type="button"
                          onClick={() => changeQty(l.product.id, 1)}
                          title="Aumentar cantidad"
                          aria-label="Aumentar cantidad"
                          className="flex h-[44px] w-[44px] items-center justify-center rounded-lg bg-white/[0.06] text-slate-300 transition-colors hover:bg-white/[0.12] active:scale-95"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="hidden w-20 shrink-0 text-right text-sm font-semibold text-white sm:block">
                        {formatMoney(l.product.price * l.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(l.product.id)}
                        title="Quitar del carrito"
                        aria-label="Quitar del carrito"
                        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}

                  {stockErrors.length > 0 && (
                    <p className="text-xs text-rose-400">{stockErrors[0]}</p>
                  )}
                </div>
              ) : (
                <p className="mb-4 rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
                  Carrito vacío. Busca un producto para agregarlo.
                </p>
              )}

              {/* Resumen */}
              <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal ({totalItems} artículos)</span>
                  <span className="font-semibold text-white">{formatMoney(subtotal)}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-slate-400">
                  <span>Total</span>
                  <span className="font-bold text-white">{formatMoney(subtotal)}</span>
                </div>
              </div>

              {/* Cliente */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Cliente</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
                >
                  <option value="" className="bg-slate-900">
                    Sin cliente (mostrador)
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900">
                      {c.name} — {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-400/60 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Estado *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SaleStatus)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
                  >
                    {SALE_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-slate-900">
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                {sale ? 'Guardar cambios' : budgetId ? 'Crear venta desde presupuesto' : 'Registrar venta rápida'}
              </button>
            </motion.form>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
