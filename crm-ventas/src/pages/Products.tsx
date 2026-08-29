import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Filter, PackageSearch, Plus, RotateCcw, Search } from 'lucide-react'
import ProductCard from '../components/products/ProductCard'
import ProductFormModal from '../components/products/ProductFormModal'
import ConfirmModal from '../components/products/ConfirmModal'
import Pagination from '../components/ui/Pagination'
import BarcodeScannerModal from '../components/ui/BarcodeScannerModal'
import { useSalesStore } from '../store/salesStore'
import type { Product } from '../types'

export default function Products({ refreshKey = 0 }: { refreshKey?: number }) {
  const products = useSalesStore((s) => s.products)
  const sales = useSalesStore((s) => s.sales)
  const removeProduct = useSalesStore((s) => s.removeProduct)
  const resetAllData = useSalesStore((s) => s.resetAllData)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [page, setPage] = useState(1)
  // Escaneo de código de barras
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerManual, setScannerManual] = useState(false)
  // Código escaneado sin producto registrado (precarga el formulario de producto)
  const [preloadBarcode, setPreloadBarcode] = useState('')
  // Código escaneado de un producto EXISTENTE: filtra la lista para mostrar solo ese producto
  const [barcodeFilter, setBarcodeFilter] = useState('')

  // Categorías disponibles (se actualizan solas al agregar/editar productos)
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products],
  )

  // Búsqueda por nombre + filtro por categoría + filtro por escaneo de código de barras
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const matchesBarcode = !barcodeFilter || (p.barcode && p.barcode.trim() === barcodeFilter)
      const matchesQuery = !q || p.name.toLowerCase().includes(q)
      const matchesCategory = category === 'all' || p.category === category
      return matchesBarcode && matchesQuery && matchesCategory
    })
  }, [products, query, category, barcodeFilter, refreshKey])

  // Paginación: 10 productos por página
  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Al buscar o filtrar, vuelve a la primera página
  useEffect(() => {
    setPage(1)
  }, [query, category, barcodeFilter])

  // Al cambiar de página, el scroll sube al principio de la lista
  useEffect(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [safePage])

  // Conteo de ventas por producto (para avisar antes de eliminar)
  const salesCountByProduct = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of sales) {
      for (const item of s.items) {
        counts.set(item.productId, (counts.get(item.productId) ?? 0) + 1)
      }
    }
    return counts
  }, [sales])

  const openCreate = () => {
    setPreloadBarcode('')
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setFormOpen(true)
  }

  // Escaneo en productos = búsqueda rápida (NO agrega al carrito)
  const handleBarcodeScanned = (code: string) => {
    console.log('📷 Código recibido en productos:', code)
    setScannerOpen(false)
    const product = products.find((p) => p.barcode && p.barcode.trim() === code.trim())
    if (product) {
      console.log('✅ Producto encontrado:', product.name)
      // Filtra la lista para mostrar SOLO ese producto (se ve en el buscador su nombre)
      setQuery(product.name)
      setBarcodeFilter(code.trim())
      setCategory('all')
      setPage(1)
      toast.success('✅ Producto encontrado')
    } else {
      console.log('⚠️ Producto no encontrado para el código:', code)
      // Toast con acción "Crear": si el usuario acepta, abre el formulario con el código
      const id = toast(
        <div className="flex items-center gap-3">
          <span>⚠️ Producto no encontrado. ¿Quieres crearlo?</span>
          <button
            type="button"
            onClick={() => {
              toast.dismiss(id)
              setPreloadBarcode(code.trim())
              setEditing(null)
              setFormOpen(true)
            }}
            className="shrink-0 rounded-lg bg-gradient-to-r from-violet-500 to-sky-500 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Crear
          </button>
        </div>,
        { id: 'scan-not-found', duration: 8000 },
      )
    }
  }

  const handleDelete = () => {
    if (!deleting) return
    try {
      removeProduct(deleting.id)
      toast('Producto eliminado', { icon: '🗑️' })
    } catch (error) {
      console.error('[electro-crm] Error al eliminar el producto:', error)
      toast.error('No se pudo eliminar el producto.')
    }
  }

  const handleReset = () => {
    resetAllData()
    setResetOpen(false)
    toast.success('Datos demo restaurados 🔄')
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
            onChange={(e) => {
              setQuery(e.target.value)
              // Si el usuario escribe en el buscador, se quita el filtro por escaneo
              setBarcodeFilter('')
            }}
            placeholder="Buscar por nombre…"
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            console.log('📷 Iniciando cámara... (productos)')
            setScannerManual(false)
            setScannerOpen(true)
          }}
          title="Escanear código de barras"
          aria-label="Escanear código de barras"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-app bg-card px-3 py-2 text-xs font-semibold text-primary transition-all hover:bg-card active:scale-95"
        >
          📷 Escanear
        </button>
        <button
          type="button"
          onClick={() => {
            console.log('⌨️ Abriendo ingreso manual de código (productos)')
            setScannerManual(true)
            setScannerOpen(true)
          }}
          title="Ingresar código de barras manualmente"
          aria-label="Ingresar código de barras manualmente"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-app bg-card px-3 py-2 text-xs font-semibold text-primary transition-all hover:bg-card active:scale-95"
        >
          ⌨️ Manual
        </button>

        <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
          <Filter className="h-4 w-4 shrink-0 text-muted" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-transparent text-sm text-primary focus:outline-none [&>option]:bg-panel"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setResetOpen(true)}
          title="Restaurar datos demo"
          className="glass glass-hover flex h-10 w-10 items-center justify-center"
        >
          <RotateCcw className="h-4 w-4 text-secondary" />
        </button>

        <button
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-95 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {filtered.length} de {products.length} productos
          {barcodeFilter ? ' · escaneado por código de barras' : ''}
          {category !== 'all' && ` en «${category}»`}
          {query.trim() && !barcodeFilter && ` · buscando «${query.trim()}»`}
        </p>
        {barcodeFilter && (
          <button
            type="button"
            onClick={() => {
              setBarcodeFilter('')
              setQuery('')
              setPage(1)
            }}
            className="shrink-0 rounded-lg border border-app bg-card px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-card active:scale-95"
          >
            Mostrar todos
          </button>
        )}
      </div>

      {/* Grid de productos */}
      {filtered.length > 0 ? (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {pageItems.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                salesCount={salesCountByProduct.get(p.id) ?? 0}
                onEdit={() => openEdit(p)}
                onDelete={() => setDeleting(p)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="glass flex flex-col items-center justify-center gap-3 py-16 text-center">
          <PackageSearch className="h-10 w-10 text-muted" />
          <p className="text-sm text-secondary">No hay productos que coincidan con tu búsqueda.</p>
          <button
            onClick={openCreate}
            className="text-sm font-semibold text-sky-400 hover:text-sky-300"
          >
            Crear producto nuevo
          </button>
        </div>
      )}

      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />

      {/* Formulario crear / editar */}
      <ProductFormModal
        open={formOpen}
        product={editing}
        initialBarcode={preloadBarcode}
        onClose={() => setFormOpen(false)}
      />

      {/* Escáner de código de barras (búsqueda rápida: no agrega al carrito) */}
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        startWithManual={scannerManual}
      />

      {/* Confirmación de eliminación */}
      <ConfirmModal
        open={deleting !== null}
        title="Eliminar producto"
        message={
          deleting
            ? `¿Seguro que quieres eliminar «${deleting.name}»? Esta acción no se puede deshacer.${
                (salesCountByProduct.get(deleting.id) ?? 0) > 0
                  ? ` Tiene ${salesCountByProduct.get(deleting.id)} venta(s) asociada(s).`
                  : ''
              }`
            : ''
        }
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />

      {/* Confirmación de restaurar demo */}
      <ConfirmModal
        open={resetOpen}
        title="Restaurar datos demo"
        message="Se reemplazarán los productos y ventas actuales por los datos de ejemplo. ¿Continuar?"
        confirmLabel="Restaurar"
        onConfirm={handleReset}
        onClose={() => setResetOpen(false)}
      />
    </motion.div>
  )
}

