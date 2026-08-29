import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Filter, PackageSearch, Plus, RotateCcw, Search } from 'lucide-react'
import ProductCard from '../components/products/ProductCard'
import ProductFormModal from '../components/products/ProductFormModal'
import ConfirmModal from '../components/products/ConfirmModal'
import Pagination from '../components/ui/Pagination'
import { useSalesStore } from '../store/salesStore'
import type { Product } from '../types'

export default function Products() {
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

  // Categorías disponibles (se actualizan solas al agregar/editar productos)
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products],
  )

  // Búsqueda por nombre + filtro por categoría
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q)
      const matchesCategory = category === 'all' || p.category === category
      return matchesQuery && matchesCategory
    })
  }, [products, query, category])

  // Paginación: 10 productos por página
  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Al buscar o filtrar, vuelve a la primera página
  useEffect(() => {
    setPage(1)
  }, [query, category])

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
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setFormOpen(true)
  }

  const handleDelete = () => {
    if (!deleting) return
    removeProduct(deleting.id)
    toast('Producto eliminado', { icon: '🗑️' })
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
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
          <Filter className="h-4 w-4 shrink-0 text-slate-500" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-transparent text-sm text-slate-200 focus:outline-none [&>option]:bg-slate-900"
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
          <RotateCcw className="h-4 w-4 text-slate-300" />
        </button>

        <button
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-95 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} de {products.length} productos
        {category !== 'all' && ` en «${category}»`}
        {query.trim() && ` · buscando «${query.trim()}»`}
      </p>

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
          <PackageSearch className="h-10 w-10 text-slate-500" />
          <p className="text-sm text-slate-400">No hay productos que coincidan con tu búsqueda.</p>
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
      <ProductFormModal open={formOpen} product={editing} onClose={() => setFormOpen(false)} />

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

