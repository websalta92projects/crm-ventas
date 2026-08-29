import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { PackagePlus, X } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import type { Product } from '../../types'
import { formatMoney } from '../../utils/format'

const EMOJIS = ['💻', '📱', '📲', '🎧', '⌚', '📺', '📷', '🎮', '⌨️', '🖱️', '🔊', '🔌', '🖨️', '📡']

interface ProductFormModalProps {
  open: boolean
  product: Product | null
  onClose: () => void
}

export default function ProductFormModal({ open, product, onClose }: ProductFormModalProps) {
  const products = useSalesStore((s) => s.products)
  const saveProduct = useSalesStore((s) => s.saveProduct)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [stock, setStock] = useState('')
  const [emoji, setEmoji] = useState('📦')

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products],
  )

  // Carga los datos al abrir (nuevo o edición)
  useEffect(() => {
    if (!open) return
    setName(product?.name ?? '')
    setDescription(product?.description ?? '')
    setCategory(product?.category ?? '')
    setPrice(product ? String(product.price) : '')
    setCost(product ? String(product.cost) : '')
    setStock(product ? String(product.stock) : '')
    setEmoji(product?.emoji || '📦')
  }, [open, product])

  const priceNum = parseFloat(price)
  const costNum = parseFloat(cost)
  const stockNum = parseInt(stock, 10)
  const numbersOk = Number.isFinite(priceNum) && Number.isFinite(costNum) && Number.isFinite(stockNum)
  const margin = numbersOk && priceNum > 0 ? ((priceNum - costNum) / priceNum) * 100 : 0
  const marginColor =
    margin >= 15 ? 'text-emerald-400' : margin >= 0 ? 'text-amber-400' : 'text-rose-400'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Escribe el nombre del producto')
      return
    }
    if (!category.trim()) {
      toast.error('Selecciona o escribe una categoría')
      return
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error('El precio de venta debe ser mayor a 0')
      return
    }
    if (!Number.isFinite(costNum) || costNum < 0) {
      toast.error('El precio de costo no puede ser negativo')
      return
    }
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      toast.error('El stock no puede ser negativo')
      return
    }

    saveProduct({
      id: product?.id,
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      price: priceNum,
      cost: costNum,
      stock: stockNum,
      emoji: emoji || '📦',
    })
    toast.success(product ? 'Producto actualizado ✅' : 'Producto creado 🎉')
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
                    <PackagePlus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {product ? 'Editar producto' : 'Nuevo producto'}
                    </h3>
                    <p className="text-xs text-slate-400">Se guarda en tu dispositivo</p>
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

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Nombre *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Audífonos Pro"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Descripción
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Características principales del producto…"
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Categoría *
                  </label>
                  <input
                    list="product-categories"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ej. Audio"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                  />
                  <datalist id="product-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Precio de venta *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Precio de costo
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Icono</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJIS.map((e) => (
                      <button
                        type="button"
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={`no-min-h flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all ${
                          emoji === e
                            ? 'border-violet-400/60 bg-violet-500/20'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Margen estimado</span>
                    <span className={`font-semibold ${marginColor}`}>
                      {numbersOk && priceNum > 0 ? `${margin.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex justify-between text-slate-400">
                    <span>Ganancia por unidad</span>
                    <span className="font-semibold text-emerald-400">
                      {numbersOk && priceNum > 0 ? formatMoney(priceNum - costNum) : '—'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  {product ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </motion.form>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

