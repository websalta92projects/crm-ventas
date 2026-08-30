import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Minus, Plus, Search, Settings2, ShoppingBag, Trash2, UserPlus, X } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { useConfigStore } from '../../store/configStore'
import { formatMoney, todayInputValue, toDateInputValue } from '../../utils/format'
import { budgetTotals } from '../../utils/budget'
import { SALE_STATUSES, STATUS_META } from '../../utils/saleStatus'
import ProductFormModal from '../products/ProductFormModal'
import CustomerFormModal from '../customers/CustomerFormModal'
import BarcodeScannerModal from '../ui/BarcodeScannerModal'
import UsbBarcodeCapture from '../ui/UsbBarcodeCapture'
import type { Customer, Product, Sale, SaleStatus } from '../../types'

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
  const [customerQuery, setCustomerQuery] = useState('')
  const [showCustomers, setShowCustomers] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
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
  // IVA y ajustes del carrito (se heredan del presupuesto si la venta nace de uno)
  const [includeTax, setIncludeTax] = useState(true)
  const [taxRate, setTaxRate] = useState(21)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(0)
  const [shippingCost, setShippingCost] = useState(0)
  const [internalNotes, setInternalNotes] = useState('')

  const isEditing = Boolean(sale)

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])

  // Cliente seleccionado (opcional: puede quedar "Sin cliente")
  const customer = customerId ? customerById.get(customerId) : undefined

  // Resultados del buscador de clientes (por nombre o teléfono)
  const customerResults = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers.slice(0, 6)
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 6)
  }, [customerQuery, customers])

  // Cliente creado/actualizado desde el modal → se selecciona automáticamente
  const handleCustomerSaved = (created: Customer) => {
    setCustomerModalOpen(false)
    setCustomerId(created.id)
    setCustomerQuery('')
    setShowCustomers(false)
  }

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
      setIncludeTax(sale.includeTax ?? true)
      setTaxRate(sale.taxRate ?? useConfigStore.getState().config.taxRate ?? 21)
      setDiscountType(sale.discountType ?? 'percentage')
      setDiscountValue(sale.discountValue ?? 0)
      setShippingCost(sale.shippingCost ?? 0)
      setInternalNotes(sale.internalNotes ?? '')
    } else {
      setCustomerId('')
      setStatus('pendiente_pago')
      setDate(todayInputValue())
      setCart([])
      setBudgetId(initialBudgetId ?? '')
      setIncludeTax(true)
      setTaxRate(useConfigStore.getState().config.taxRate ?? 21)
      setDiscountType('percentage')
      setDiscountValue(0)
      setShippingCost(0)
      setInternalNotes('')
      if (initialBudgetId) {
        const b = budgets.find((x) => x.id === initialBudgetId)
        if (b) {
          setCustomerId(b.customerId)
          setCart(b.items.map((i) => ({ productId: i.productId, quantity: i.quantity })))
          setIncludeTax(b.includeTax ?? true)
          setTaxRate(b.taxRate ?? useConfigStore.getState().config.taxRate ?? 21)
          setDiscountType(b.discountType ?? 'percentage')
          setDiscountValue(b.discountValue ?? 0)
          setShippingCost(b.shippingCost ?? 0)
          setInternalNotes(b.internalNotes ?? '')
        }
      }
    }
    setQuery('')
    setShowResults(false)
    setProductModalOpen(false)
    setScannerOpen(false)
    setPreloadBarcode('')
    setCustomerQuery('')
    setShowCustomers(false)
    setCustomerModalOpen(false)
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
      setIncludeTax(b.includeTax ?? true)
      setTaxRate(b.taxRate ?? useConfigStore.getState().config.taxRate ?? 21)
      setDiscountType(b.discountType ?? 'percentage')
      setDiscountValue(b.discountValue ?? 0)
      setShippingCost(b.shippingCost ?? 0)
      setInternalNotes(b.internalNotes ?? '')
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

  // Total = Subtotal - Descuento + IVA + Envío (misma fórmula que el recibo)
  const totals = budgetTotals(
    lines.map((l) => ({ unitPrice: l.product.price, quantity: l.qty })),
    { includeTax, taxRate, discountType, discountValue, shippingCost },
  )
  const discount = totals.discount
  const tax = totals.tax
  const shipping = totals.shipping
  const total = totals.total

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
        includeTax,
        taxRate,
        discountType,
        discountValue,
        shippingCost,
        internalNotes,
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
            active={open && !productModalOpen && !scannerOpen && !customerModalOpen}
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

              {/* Cliente: tarjeta seleccionada o buscador (opcional) */}
              {customer ? (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-app bg-card p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-xs font-bold text-white">
                    {customer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{customer.name}</p>
                    <p className="truncate text-xs text-secondary">
                      {customer.phone || 'Sin teléfono'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerId('')
                      setCustomerQuery('')
                      setShowCustomers(true)
                    }}
                    className="glass glass-hover flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-sky-300"
                  >
                    Cambiar cliente
                  </button>
                </div>
              ) : (
                <div className="relative mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Cliente <span className="text-muted">(opcional)</span>
                  </label>
                  <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-muted" />
                    <input
                      value={customerQuery}
                      onChange={(e) => {
                        setCustomerQuery(e.target.value)
                        setShowCustomers(true)
                      }}
                      onFocus={() => setShowCustomers(true)}
                      placeholder="Buscar cliente…"
                      className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  {showCustomers && (
                    <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-app bg-panel shadow-xl backdrop-blur-md">
                      {/* Vender sin cliente (mostrador) */}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerId('')
                          setCustomerQuery('')
                          setShowCustomers(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-card"
                      >
                        <span className="text-base">🧍</span>
                        <span className="flex-1">Sin cliente (mostrador)</span>
                      </button>
                      {customerResults.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => {
                            setCustomerId(c.id)
                            setCustomerQuery('')
                            setShowCustomers(false)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-card"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          <span className="text-xs text-muted">{c.phone}</span>
                        </button>
                      ))}
                      {customerResults.length === 0 && (
                        <p className="border-t border-app px-3 py-2 text-xs text-muted">
                          No se encontraron clientes
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomers(false)
                          setCustomerModalOpen(true)
                        }}
                        className="flex w-full items-center gap-2 border-t border-app px-3 py-2 text-left text-sm font-medium text-sky-300 transition-colors hover:bg-card"
                      >
                        <UserPlus className="h-4 w-4" />
                        Crear cliente nuevo…
                      </button>
                    </div>
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

              {/* Ajustes de la venta: descuento, envío y notas internas (solo vendedor) */}
              <div className="mb-4 rounded-xl border border-app bg-card/60 p-4 backdrop-blur-md">
                <div className="mb-3 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-violet-300" />
                  <h4 className="text-sm font-semibold text-white">Ajustes de la venta</h4>
                </div>

                {/* Descuento: porcentaje o monto fijo */}
                <div className="mb-3">
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Descuento
                  </label>
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      aria-pressed={discountType === 'percentage'}
                      className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-semibold transition-all active:scale-95 ${
                        discountType === 'percentage'
                          ? 'border-violet-400/60 bg-violet-500/15 text-white'
                          : 'border-app bg-card text-secondary hover:text-primary'
                      }`}
                    >
                      Porcentaje
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      aria-pressed={discountType === 'fixed'}
                      className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-semibold transition-all active:scale-95 ${
                        discountType === 'fixed'
                          ? 'border-violet-400/60 bg-violet-500/15 text-white'
                          : 'border-app bg-card text-secondary hover:text-primary'
                      }`}
                    >
                      Monto fijo
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={discountType === 'percentage' ? 100 : undefined}
                      step="any"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder={
                        discountType === 'percentage' ? 'Ej. 10 = 10%' : 'Ej. 50 = $ 50,00'
                      }
                      aria-label="Valor del descuento"
                      className="min-h-[44px] w-full rounded-xl border border-app bg-card px-3 pr-8 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                      {discountType === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </div>

                {/* Gastos de envío */}
                <div className="mb-3">
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Gastos de envío
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={shippingCost || ''}
                      onChange={(e) => setShippingCost(Number(e.target.value))}
                      placeholder="Ej. 50"
                      aria-label="Gastos de envío"
                      className="min-h-[44px] w-full rounded-xl border border-app bg-card px-3 pr-8 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                      $
                    </span>
                  </div>
                </div>

                {/* Notas internas: solo las ve el vendedor */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Notas internas{' '}
                    <span className="text-muted">(solo vendedor, no salen en el recibo)</span>
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={2}
                    placeholder="Comentarios internos para ti (no aparecen en PDF ni WhatsApp)"
                    aria-label="Notas internas"
                    className="min-h-[44px] w-full resize-none rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
                  />
                </div>
              </div>

              {/* Resumen */}
              <div className="mb-4 rounded-xl border border-app bg-card p-4 text-sm">
                <div className="flex justify-between text-secondary">
                  <span>Subtotal ({totalItems} artículos)</span>
                  <span className="font-semibold text-white">{formatMoney(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="mt-1.5 flex justify-between text-rose-300">
                    <span>Descuento</span>
                    <span className="font-semibold">-{formatMoney(discount)}</span>
                  </div>
                )}
                {includeTax && tax > 0 && (
                  <div className="mt-1.5 flex justify-between text-secondary">
                    <span>Impuestos ({Math.round(taxRate)}%)</span>
                    <span className="font-semibold text-secondary">{formatMoney(tax)}</span>
                  </div>
                )}
                {shipping > 0 && (
                  <div className="mt-1.5 flex justify-between text-secondary">
                    <span>Envío</span>
                    <span className="font-semibold text-secondary">{formatMoney(shipping)}</span>
                  </div>
                )}
                <div className="mt-1.5 flex justify-between border-t border-app pt-2">
                  <span>Total</span>
                  <span className="font-bold text-white">{formatMoney(total)}</span>
                </div>
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

      {/* Modal de cliente: al guardar selecciona el cliente y cierra el buscador */}
      <CustomerFormModal
        open={customerModalOpen}
        customer={null}
        onClose={() => setCustomerModalOpen(false)}
        onSaved={handleCustomerSaved}
      />
    </>
  )
}
