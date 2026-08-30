import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plus, Search, UsersRound } from 'lucide-react'
import CustomerCard from '../components/customers/CustomerCard'
import CustomerFormModal from '../components/customers/CustomerFormModal'
import CustomerHistoryModal from '../components/customers/CustomerHistoryModal'
import ConfirmModal from '../components/products/ConfirmModal'
import Pagination from '../components/ui/Pagination'
import { useSalesStore } from '../store/salesStore'
import { saleTotal } from '../utils/sale'
import type { Customer } from '../types'

export default function Customers({
  refreshKey = 0,
  initialQuery = '',
}: {
  refreshKey?: number
  initialQuery?: string
}) {
  const customers = useSalesStore((s) => s.customers)
  const sales = useSalesStore((s) => s.sales)
  const removeCustomer = useSalesStore((s) => s.removeCustomer)

  const [query, setQuery] = useState(initialQuery)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
  const [page, setPage] = useState(1)

  // Aplica la búsqueda inicial pedida desde el Dashboard (cliente frecuente)
  useEffect(() => {
    if (initialQuery) setQuery(initialQuery)
  }, [initialQuery])

  // Al buscar o filtrar, vuelve a la primera página
  useEffect(() => {
    setPage(1)
  }, [query])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    )
  }, [customers, query, refreshKey])

  // Paginación: 6 clientes por página
  const PAGE_SIZE = 6
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Resumen de compras por cliente (cantidad y total gastado)
  const purchasesByCustomer = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    for (const s of sales) {
      if (!s.customerId) continue
      const agg = map.get(s.customerId) ?? { count: 0, total: 0 }
      agg.count += 1
      agg.total += saleTotal(s)
      map.set(s.customerId, agg)
    }
    return map
  }, [sales])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setFormOpen(true)
  }

  const handleDelete = () => {
    if (!deleting) return
    try {
      removeCustomer(deleting.id)
      toast('Cliente eliminado', { icon: '🗑️' })
    } catch (error) {
      console.error('[electro-crm] Error al eliminar el cliente:', error)
      toast.error('No se pudo eliminar el cliente.')
    }
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
            placeholder="Buscar por nombre, email o teléfono…"
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
          />
        </div>

        <button
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-95 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </button>
      </div>

      <p className="text-xs text-muted">
        {filtered.length} de {customers.length} clientes
        {query.trim() && ` · buscando «${query.trim()}»`}
      </p>

      {/* Grid de clientes */}
      {filtered.length > 0 ? (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {pageItems.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                purchases={purchasesByCustomer.get(c.id) ?? { count: 0, total: 0 }}
                onViewHistory={() => setHistoryCustomer(c)}
                onEdit={() => openEdit(c)}
                onDelete={() => setDeleting(c)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="glass flex flex-col items-center justify-center gap-3 py-16 text-center">
          <UsersRound className="h-10 w-10 text-muted" />
          <p className="text-sm text-secondary">
            {customers.length === 0
              ? 'Todavía no hay clientes registrados.'
              : 'No hay clientes que coincidan con la búsqueda.'}
          </p>
          {customers.length === 0 && (
            <button
              onClick={openCreate}
              className="text-sm font-semibold text-sky-400 hover:text-sky-300"
            >
              Crear el primer cliente
            </button>
          )}
        </div>
      )}

      {/* Paginación */}
      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />

      {/* Formulario crear / editar */}
      <CustomerFormModal open={formOpen} customer={editing} onClose={() => setFormOpen(false)} />

      {/* Historial de compras */}
      <CustomerHistoryModal
        open={historyCustomer !== null}
        customer={historyCustomer}
        onClose={() => setHistoryCustomer(null)}
      />

      {/* Confirmación de eliminación */}
      <ConfirmModal
        open={deleting !== null}
        title="Eliminar cliente"
        message={
          deleting
            ? `¿Seguro que quieres eliminar a «${deleting.name}»? Esta acción no se puede deshacer.${
                (purchasesByCustomer.get(deleting.id)?.count ?? 0) > 0
                  ? ` Tiene ${purchasesByCustomer.get(deleting.id)?.count} compra(s) asociada(s).`
                  : ''
              }`
            : ''
        }
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </motion.div>
  )
}

