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
  Settings2,
  UserPlus,
  X,
} from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { useConfigStore } from '../../store/configStore'
import { formatMoney, formatDateOnly } from '../../utils/format'
import { budgetTotals, buildBudgetText, buildWhatsAppLink } from '../../utils/budget'
import { generateDocumentPDF, getDocumentPDFBlob } from '../../utils/documentPDF'
import { trySharePdf } from '../../utils/pdfShare'
import CustomerFormModal from '../customers/CustomerFormModal'
import ProductFormModal from '../products/ProductFormModal'
import BarcodeScannerModal from '../ui/BarcodeScannerModal'
import UsbBarcodeCapture from '../ui/UsbBarcodeCapture'
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
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  // true → el escáner abre directo en modo de ingreso manual (⌨️)
  const [scannerManual, setScannerManual] = useState(false)
  // Código de barras escaneado sin producto registrado (precarga el modal de producto)
  const [preloadBarcode, setPreloadBarcode] = useState('')
  // IVA configurable POR presupuesto (por defecto: activado con el % de Configuración)
  const [includeTax, setIncludeTax] = useState(true)
  const [taxRate, setTaxRate] = useState(21)
  // Ajustes del carrito: descuento, envío y notas internas (solo vendedor)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(0)
  const [shippingCost, setShippingCost] = useState(0)
  const [internalNotes, setInternalNotes] = useState('')

  // Carga los datos al abrir
  useEffect(() => {
    if (!open) return
    if (budget) {
      setCustomerId(budget.customerId)
      setCart(budget.items.map((i) => ({ productId: i.productId, quantity: i.quantity })))
      setIncludeTax(budget.includeTax ?? true)
      setTaxRate(budget.taxRate ?? useConfigStore.getState().config.taxRate ?? 21)
      setDiscountType(budget.discountType ?? 'percentage')
      setDiscountValue(budget.discountValue ?? 0)
      setShippingCost(budget.shippingCost ?? 0)
      setInternalNotes(budget.internalNotes ?? '')
    } else {
      setCustomerId('')
      setCart([])
      setIncludeTax(true)
      setTaxRate(useConfigStore.getState().config.taxRate ?? 21)
      setDiscountType('percentage')
      setDiscountValue(0)
      setShippingCost(0)
      setInternalNotes('')
    }
    setProductQuery('')
    setShowProducts(false)
    setCustomerQuery('')
    setShowCustomers(false)
    setCustomerModalOpen(false)
    setProductModalOpen(false)
    setScannerOpen(false)
    setPreloadBarcode('')
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

  // Abre el modal para crear un producto nuevo (precargado con el texto buscado)
  const openCreateProduct = () => {
    setShowProducts(false)
    setPreloadBarcode('')
    setProductModalOpen(true)
  }

  // Busca el producto por código de barras y lo agrega al carrito (cantidad 1 o +1).
  // Devuelve true si lo agregó.
  const addByBarcode = (code: string): boolean => {
    setShowProducts(false)
    setProductQuery('')
    const product = products.find((p) => p.barcode && p.barcode.trim() === code.trim())
    if (!product) return false
    addProduct(product)
    toast.success(`«${product.name}» agregado al carrito 📦`)
    return true
  }

  // Cámara 📱: si no existe el producto, ofrece crearlo con el código precargado
  const handleCameraBarcodeScanned = (code: string) => {
    console.log('📷 Código recibido en presupuesto:', code)
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
    setProductQuery('')
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

  const lines = useMemo(
    () =>
      cart
        .map((l) => ({ product: productById.get(l.productId), qty: l.quantity }))
        .filter((l): l is { product: Product; qty: number } => Boolean(l.product)),
    [cart, productById],
  )

  const totals = budgetTotals(
    lines.map((l) => ({ unitPrice: l.product.price, quantity: l.qty })),
    { includeTax, taxRate, discountType, discountValue, shippingCost },
  )
  const { subtotal, tax, total } = totals
  const discount = totals.discount
  const shipping = totals.shipping
  const customer = customerId ? customerById.get(customerId) : undefined

  const selectedCustomerName = customer?.name ?? 'Sin cliente'

  // Cliente creado/actualizado desde el modal de cliente → se selecciona automáticamente
  // y se cierra el dropdown (el campo muestra su nombre)
  const handleCustomerSaved = (created: Customer) => {
    setCustomerId(created.id)
    setCustomerQuery('')
    setShowCustomers(false)
  }

  // Guarda como Enviado, genera el PDF y lo comparte por WhatsApp (con adjunto si es posible)
  const sendBudget = async () => {
    if (lines.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }
    if (!customerId) {
      toast.error('Selecciona o crea un cliente')
      return
    }
    const config = useConfigStore.getState().config
    const number = budget?.number ?? config.budgetCounter
    const items = currentItems()
    const { subtotal, tax, discount, shipping, total } = budgetTotals(items, {
      includeTax,
      taxRate,
      discountType,
      discountValue,
      shippingCost,
    })
    const text = buildCurrentText(number)

    // 1. Marca el presupuesto como Enviado
    try {
      saveBudget({
        id: budget?.id,
        customerId,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
        status: 'enviado',
        includeTax,
        taxRate,
        discountType,
        discountValue,
        shippingCost,
        internalNotes,
      })
    } catch (error) {
      console.error('[electro-crm] Error al enviar el presupuesto:', error)
      toast.error('No se pudo enviar el presupuesto.')
      return
    }
    toast.success('Presupuesto enviado 📤')
    onClose()

    // 2. Genera el PDF y lo comparte por WhatsApp (con adjunto en móvil)
    try {
      const blob = await getDocumentPDFBlob({
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
        includeTax,
        taxRate,
        discount,
        shipping,
        config,
      })
      const shared = await trySharePdf(text, blob, `presupuesto-${number}.pdf`)
      if (!shared) {
        const phone = customer?.phone || config.phone
        window.open(buildWhatsAppLink(phone, text), '_blank')
      }
    } catch {
      // Si no se pudo generar/compartir el PDF, abre WhatsApp con el mensaje de texto
      const phone = customer?.phone || config.phone
      window.open(buildWhatsAppLink(phone, text), '_blank')
    }
  }

  // Texto unificado: '📋 Copiar' y '📤 WhatsApp' generan EXACTAMENTE el mismo mensaje
  const buildCurrentText = (number?: number): string => {
    const items = currentItems()
    const { subtotal, tax, discount, shipping, total } = budgetTotals(items, {
      includeTax,
      taxRate,
      discountType,
      discountValue,
      shippingCost,
    })
    return buildBudgetText({
      numberLabel: number ? String(number) : budget ? String(budget.number) : 'NUEVO',
      customerName: selectedCustomerName,
      date: formatDateOnly(budget?.createdAt ?? new Date().toISOString()),
      items,
      subtotal,
      tax,
      total,
      includeTax,
      taxRate,
      discount,
      shipping,
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
      emoji: l.product.emoji || '',
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
    const { subtotal, tax, discount, shipping, total } = budgetTotals(items, {
      includeTax,
      taxRate,
      discountType,
      discountValue,
      shippingCost,
    })
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
        includeTax,
        taxRate,
        discount,
        shipping,
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
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="glass-strong my-4 w-[95%] max-h-[90vh] max-w-lg overflow-y-auto p-4 sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 shadow-lg shadow-violet-500/30">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {budget ? `Editar presupuesto #${budget.number}` : 'Nuevo presupuesto'}
                    </h3>
                    <p className="text-xs text-secondary">
                      {includeTax ? `IVA del ${Math.round(taxRate)}% incluido` : 'Sin IVA'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  title="Cerrar"
                  aria-label="Cerrar"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-secondary transition-colors hover:bg-card hover:text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">

              {/* Cliente: tarjeta seleccionada o buscador */}
              {customer ? (
                <div className="flex items-center gap-3 rounded-xl border border-app bg-card p-4">
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
                <div className="relative">
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Cliente *
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
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{c.name}</span>
                          <span className="text-xs text-muted">{c.phone}</span>
                        </button>
                      ))}
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

              {/* Agregar producto */}
              <div className="relative">
                <label className="mb-1.5 block text-xs font-medium text-secondary">
                  Agregar producto
                </label>
                <div className="flex items-stretch gap-2">
                  <div className="glass flex flex-1 items-center gap-2 rounded-xl px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-muted" />
                    <input
                      value={productQuery}
                      onChange={(e) => {
                        setProductQuery(e.target.value)
                        setShowProducts(true)
                      }}
                      onFocus={() => setShowProducts(true)}
                      placeholder="Buscar por nombre…"
                      className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('📷 Iniciando cámara... (desde presupuesto)')
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
                {showProducts && productResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-app bg-panel shadow-xl backdrop-blur-md">
                    {productResults.map((p) => {
                      const inCart = cart.some((l) => l.productId === p.id)
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 border-b border-app px-3 py-2 last:border-0"
                        >
                          <span className="text-lg">{p.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-primary">{p.name}</p>
                            <p className="text-[11px] text-muted">
                              {formatMoney(p.price)} · {p.stock} u.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addProduct(p)}
                            className={`flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold transition-all active:scale-95 ${
                              inCart
                                ? 'border border-sky-400/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                                : 'bg-gradient-to-r from-violet-500 to-sky-500 text-white shadow-lg shadow-violet-500/25 hover:brightness-110'
                            }`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {inCart ? 'Agregar +1' : 'Agregar'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {productQuery.trim() !== '' && productResults.length === 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-muted">
                      Sin resultados para «{productQuery.trim()}».
                    </p>
                    <button
                      type="button"
                      onClick={openCreateProduct}
                      className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 text-xs font-semibold text-violet-200 transition-all hover:bg-violet-500/25 active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      Crear producto «{productQuery.trim()}»
                    </button>
                  </div>
                )}
              </div>

              {/* Carrito */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-medium text-secondary">
                    Carrito ({lines.length})
                  </label>
                  {lines.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-xs font-medium text-rose-400 transition-colors hover:text-rose-300"
                    >
                      Vaciar carrito
                    </button>
                  )}
                </div>
                {lines.length > 0 ? (
                  <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                    {lines.map((l) => (
                      <motion.div
                        key={l.product.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-app bg-card p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{l.product.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{l.product.name}</p>
                            <p className="text-[11px] text-muted">
                              {formatMoney(l.product.price)} / u.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(l.product.id)}
                            title="Eliminar del carrito"
                            aria-label={`Eliminar ${l.product.name} del carrito`}
                            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
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
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wide text-muted">
                              Subtotal
                            </p>
                            <p className="text-sm font-bold text-white">
                              {formatMoney(l.product.price * l.qty)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-app px-3 py-6 text-center text-xs text-muted">
                    No hay productos agregados
                  </p>
                )}
              </div>

              {/* Totales destacados */}
              <div className="rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-sky-500/10 p-4 text-sm shadow-lg shadow-violet-500/10">
                {/* IVA configurable POR presupuesto */}
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-xs font-semibold text-secondary">Incluir IVA</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeTax}
                    aria-label="Incluir IVA"
                    onClick={() => setIncludeTax((v) => !v)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      includeTax ? 'bg-gradient-to-r from-violet-500 to-sky-500' : 'bg-slate-500/40'
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        includeTax ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">{formatMoney(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="mt-2 flex justify-between text-rose-300">
                    <span>Descuento</span>
                    <span className="font-semibold">-{formatMoney(discount)}</span>
                  </div>
                )}
                {includeTax && (
                  <div className="mt-2 flex justify-between text-secondary">
                    <span>Impuestos ({Math.round(taxRate)}%)</span>
                    <span className="font-semibold text-secondary">{formatMoney(tax)}</span>
                  </div>
                )}
                {shipping > 0 && (
                  <div className="mt-2 flex justify-between text-secondary">
                    <span>Envío</span>
                    <span className="font-semibold text-secondary">{formatMoney(shipping)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-app pt-2">
                  <span className="font-semibold text-white">Total</span>
                  <span className="text-lg font-extrabold text-emerald-300">
                    {formatMoney(total)}
                  </span>
                </div>
              </div>

              {/* Ajustes del presupuesto: descuento, envío y notas internas (solo vendedor) */}
              <div className="rounded-xl border border-app bg-card/60 p-4 backdrop-blur-md">
                <div className="mb-3 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-violet-300" />
                  <h4 className="text-sm font-semibold text-white">Ajustes del presupuesto</h4>
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
                    <span className="text-muted">(solo vendedor, no salen en el presupuesto)</span>
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

              {/* Acciones: fila 1 (PDF / WhatsApp / Copiar) + fila 2 (guardar / enviar) */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handlePdf}
                    title="Generar PDF"
                    aria-label="Generar PDF"
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-2 py-2 text-[11px] font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 active:scale-95"
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    title="Enviar por WhatsApp"
                    aria-label="Enviar por WhatsApp"
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-2 py-2 text-[11px] font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:brightness-110 active:scale-95"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </button>
                  <button
                    onClick={copyToWhatsApp}
                    title="Copiar texto"
                    aria-label="Copiar texto"
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-app bg-card px-2 py-2 text-[11px] font-semibold text-primary transition-all hover:bg-card active:scale-95"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    Copiar
                  </button>
                </div>
                <div>
                  <button
                    onClick={sendBudget}
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                    📤 Enviar presupuesto
                  </button>
                  <p className="mt-1.5 text-center text-[11px] text-muted">
                    Genera el PDF, abre WhatsApp y marca el presupuesto como enviado.
                  </p>
                </div>
              </div>
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

    {/* Modal de producto: al guardar se agrega al carrito */}
    <ProductFormModal
      open={productModalOpen}
      product={null}
      initialName={productQuery.trim()}
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
