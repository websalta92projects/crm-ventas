import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { formatMoney, todayInputValue, toDateInputValue } from '../../utils/format'
import { SALE_STATUSES, STATUS_META } from '../../utils/saleStatus'
import ProductFormModal from '../products/ProductFormModal'
import BarcodeScannerModal from '../ui/BarcodeScannerModal'
import UsbBarcodeCapture from '../ui/UsbBarcodeCapture'
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
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  // true → el escáner abre directo en modo de ingreso manual (⌨️)
  const [scannerManual, setScannerManual] = useState(false)
  // Código de barras escaneado sin producto registrado (precarga el modal de producto)
  const [preloadBarcode, setPreloadBarcode] = useState('')

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
    setProductModalOpen(false)
    setScannerOpen(false)
    setPreloadBarcode('')
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

  // Abre el modal para crear un producto nuevo (precargado con el texto buscado)
  const openCreateProduct = () => {
    setShowResults(false)
    setPreloadBarcode('')
    setProductModalOpen(true)
  }

  // Busca el producto por código de barras y lo agrega al carrito (cantidad 1 o +1).
  // Devuelve true si lo agregó.
  const addByBarcode = (code: string): boolean => {
    setShowResults(false)
    setQuery('')
    const product = products.find((p) => p.barcode && p.barcode.trim() === code.trim())
    if (!product) return false
    addProduct(product)
    toast.success(`«${product.name}» agregado al carrito 📦`)
    return true
  }

  // Cámara 📱: si no existe el producto, ofrece crearlo con el código precargado
  const handleCameraBarcodeScanned = (code: string) => {
    console.log('📷 Código recibido en venta:', code)
    setScannerOpen(false)
    if (addByBarcode(code)) return
    console.log('📷 Producto no encontrado para el código:', code)
    if (window.confirm('Producto no encontrado. ¿Quieres crearlo?')) {
      setPreloadBarcode(code.trim())
      setProductModalOpen(true)
    }
  }

  // Lector USB 💻: si no existe, solo avisa (sin abrir la cámara ni el formulario)
  const handleUsbBarcodeScanned = (code: string) => {
    if (addByBarcode(code)) return
    toast.error('Producto no encontrado. Escanea con la cámara o crea el producto manualmente.')
  }

  // Producto creado desde el modal → se agrega al carrito automáticamente
  const handleProductSaved = (created: Product) => {
    setProductModalOpen(false)
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === created.id)
      if (existing) {
        return prev.map((l) =>
          l.productId === created.id ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { productId: created.id, quantity: 1 }]
    })
    setQuery('')
    toast.success(`Producto «${created.name}» agregado al carrito 🛒`)
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

    try {
      saveSale({
        id: sale?.id,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
        customerId,
        status,
        date: new Date(`${date}T12:00:00`).toISOString(),
        budgetId: budgetId || undefined,
      })
    } catch (error) {
      console.error('[electro-crm] Error al guardar la venta:', error)
      toast.error('No se pudo guardar la venta. Inténtalo de nuevo.')
      return
    }
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
    <>
      <AnimatePresence>
      {open && (
        <>
          {/* Campo oculto que captura el input del lector USB de código de barras */}
          <UsbBarcodeCapture
            active={open && !productModalOpen && !scannerOpen}
            onScan={handleUsbBarcodeScanned}
          />
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
                    <p className="text-xs text-secondary">
                      El stock se descuenta al guardar · estado inicial: Pendiente de pago
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-secondary hover:bg-card hover:text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Selector de presupuesto (solo al crear) */}
              {!sale && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Origen de la venta
                  </label>
                  <select
                    value={budgetId}
                    onChange={(e) => handleSelectBudget(e.target.value)}
                    className="w-full rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
                  >
                    <option value="" className="bg-panel">
                      ⚡ Venta rápida (sin presupuesto)
                    </option>
                    {convertibleBudgets.map((b) => (
                      <option key={b.id} value={b.id} className="bg-panel">
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
                <label className="mb-1.5 block text-xs font-medium text-secondary">
                  Agregar producto
                </label>
                <div className="flex items-stretch gap-2">
                  <div className="glass flex flex-1 items-center gap-2 rounded-xl px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-muted" />
                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        setShowResults(true)
                      }}
                      onFocus={() => setShowResults(true)}
                      placeholder="Buscar por nombre…"
                      className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('📷 Iniciando cámara... (desde venta)')
                      setScannerManual(false)
                      setScannerOpen(true)
                    }}
                    title="Escanear código de barras con la cámara"
                    aria-label="Escanear código de barras"
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-app bg-card px-2.5 text-xs font-semibold text-primary transition-all hover:bg-card hover:text-primary active:scale-95"
                  >
                    📷 Escanear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('⌨️ Abriendo ingreso manual de código')
                      setScannerManual(true)
                      setScannerOpen(true)
                    }}
                    title="Ingresar código de barras manualmente"
                    aria-label="Ingresar código de barras manualmente"
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-app bg-card px-2.5 text-xs font-semibold text-primary transition-all hover:bg-card hover:text-primary active:scale-95"
                  >
                    ⌨️ Manual
                  </button>
                </div>
                {showResults && productResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-app bg-panel shadow-xl backdrop-blur-md">
                    {productResults.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => addProduct(p)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-card"
                      >
                        <span className="text-lg">{p.emoji}</span>
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-secondary">
                          {formatMoney(p.price)} · {p.stock} u.
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {query.trim() !== '' && productResults.length === 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-muted">
                      Sin resultados para «{query.trim()}».
                    </p>
                    <button
                      type="button"
                      onClick={openCreateProduct}
                      className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 text-xs font-semibold text-violet-200 transition-all hover:bg-violet-500/25 active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      Crear producto «{query.trim()}»
                    </button>
                  </div>
                )}
              </div>

              {/* Carrito */}
              {lines.length > 0 ? (
                <div className="mb-4 max-h-[300px] space-y-2 overflow-y-auto pr-1">
                  <p className="text-xs font-medium text-secondary">
                    Carrito · {totalItems} artículo{totalItems === 1 ? '' : 's'}
                  </p>
                  {lines.map((l) => (
                    <motion.div
                      key={l.product.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 rounded-xl border border-app bg-card px-3 py-2 sm:gap-3"
                    >
                      <span className="text-lg">{l.product.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{l.product.name}</p>
                        <p className="text-[11px] text-muted">
                          {formatMoney(l.product.price)} / u.
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeQty(l.product.id, -1)}
                          title="Disminuir cantidad"
                          aria-label="Disminuir cantidad"
                          className="flex h-[44px] w-[44px] items-center justify-center rounded-lg bg-card text-secondary transition-colors hover:bg-card active:scale-95"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={l.qty}
                          onChange={(e) => setQty(l.product.id, Number(e.target.value))}
                          aria-label={`Cantidad de ${l.product.name}`}
                          className="h-[44px] w-14 rounded-lg border border-app bg-card text-center text-sm font-semibold text-white outline-none transition-colors focus:border-violet-400/60"
                        />
                        <button
                          type="button"
                          onClick={() => changeQty(l.product.id, 1)}
                          title="Aumentar cantidad"
                          aria-label="Aumentar cantidad"
                          className="flex h-[44px] w-[44px] items-center justify-center rounded-lg bg-card text-secondary transition-colors hover:bg-card active:scale-95"
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
                        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-rose-500/15 hover:text-rose-400"
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
                <p className="mb-4 rounded-xl border border-dashed border-app px-3 py-4 text-center text-xs text-muted">
                  Carrito vacío. Busca un producto para agregarlo.
                </p>
              )}

              {/* Resumen */}
              <div className="mb-4 rounded-xl border border-app bg-card p-4 text-sm">
                <div className="flex justify-between text-secondary">
                  <span>Subtotal ({totalItems} artículos)</span>
                  <span className="font-semibold text-white">{formatMoney(subtotal)}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-secondary">
                  <span>Total</span>
                  <span className="font-bold text-white">{formatMoney(subtotal)}</span>
                </div>
              </div>

              {/* Cliente */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-secondary">Cliente</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
                >
                  <option value="" className="bg-panel">
                    Sin cliente (mostrador)
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-panel">
                      {c.name} — {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-400/60 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Estado *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SaleStatus)}
                    className="w-full rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
                  >
                    {SALE_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-panel">
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

      {/* Modal de producto: al guardar se agrega al carrito */}
      <ProductFormModal
        open={productModalOpen}
        product={null}
        initialName={query.trim()}
        initialBarcode={preloadBarcode}
        onClose={() => setProductModalOpen(false)}
        onSaved={handleProductSaved}
      />

      {/* Modal de escáner de código de barras (cámara) */}
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleCameraBarcodeScanned}
        startWithManual={scannerManual}
      />
    </>
  )
}
