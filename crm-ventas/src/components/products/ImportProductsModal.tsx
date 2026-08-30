import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, FileUp, UploadCloud, X } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { parseProductsCSV, type CsvImportResult } from '../../utils/csvImport'
import { registerCategory } from '../../utils/categories'

interface ImportProductsModalProps {
  open: boolean
  onClose: () => void
}

interface ImportOutcome {
  imported: number
  duplicated: number
}

export default function ImportProductsModal({ open, onClose }: ImportProductsModalProps) {
  const products = useSalesStore((s) => s.products)
  const saveProduct = useSalesStore((s) => s.saveProduct)
  const fileRef = useRef<HTMLInputElement>(null)

  const [parsing, setParsing] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<CsvImportResult | null>(null)
  const [done, setDone] = useState(false)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)

  // Detecta cuántos productos del CSV ya existen en el catálogo
  // (por código de barras si lo tienen; si no, por nombre)
  const duplicateCount = useMemo(() => {
    if (!result) return 0
    const byBarcode = new Map(
      products
        .filter((p) => p.barcode && p.barcode.trim())
        .map((p) => [p.barcode!.trim(), p.name]),
    )
    const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p.name]))
    const seen = new Set<string>()
    let count = 0
    for (const c of result.products) {
      const kb = c.barcode?.trim()
      const kn = c.name.trim().toLowerCase()
      const dup = kb
        ? byBarcode.has(kb) || seen.has(`b:${kb}`)
        : byName.has(kn) || seen.has(`n:${kn}`)
      if (dup) {
        count++
        continue
      }
      if (kb) seen.add(`b:${kb}`)
      seen.add(`n:${kn}`)
    }
    return count
  }, [result, products])

  const importableCount = (result?.products.length ?? 0) - duplicateCount

  const reset = () => {
    setParsing(false)
    setFileName('')
    setResult(null)
    setDone(false)
    setOutcome(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const close = () => {
    reset()
    onClose()
  }

  const handleFile = async (file: File) => {
    setParsing(true)
    setFileName(file.name)
    setDone(false)
    setOutcome(null)
    setResult(null)
    try {
      const res = await parseProductsCSV(file)
      setResult(res)
    } catch (error) {
      console.error('[electro-crm] Error al leer el CSV:', error)
      const message = error instanceof Error ? error.message : 'No se pudo leer el archivo CSV.'
      toast.error(message)
      setResult(null)
    } finally {
      setParsing(false)
    }
  }

  const handleImport = () => {
    if (!result || result.products.length === 0) return
    try {
      const byBarcode = new Map(
        products
          .filter((p) => p.barcode && p.barcode.trim())
          .map((p) => [p.barcode!.trim(), p.name]),
      )
      const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p.name]))
      const seen = new Set<string>()

      let imported = 0
      let duplicated = 0
      const importedCategories = new Set<string>()

      for (const candidate of result.products) {
        const kb = candidate.barcode?.trim()
        const kn = candidate.name.trim().toLowerCase()
        // Duplicado: por código de barras si lo tiene; si no, por nombre
        const isDuplicate = kb
          ? byBarcode.has(kb) || seen.has(`b:${kb}`)
          : byName.has(kn) || seen.has(`n:${kn}`)
        if (isDuplicate) {
          duplicated++
          toast(`⚠️ Producto «${candidate.name}» ya existe. Saltado.`)
          continue
        }
        saveProduct(candidate)
        imported++
        if (kb) {
          byBarcode.set(kb, candidate.name)
          seen.add(`b:${kb}`)
        }
        byName.set(kn, candidate.name)
        seen.add(`n:${kn}`)
        if (candidate.category) importedCategories.add(candidate.category)
      }

      // Registra las categorías nuevas en LocalStorage (consistente con el formulario)
      for (const cat of importedCategories) registerCategory(cat)

      const parts = [`✅ ${imported} producto${imported === 1 ? '' : 's'} importado${imported === 1 ? '' : 's'} correctamente.`]
      if (duplicated > 0) {
        parts.push(
          `⚠️ ${duplicated} producto${duplicated === 1 ? '' : 's'} saltado${duplicated === 1 ? '' : 's'} por estar duplicado${duplicated === 1 ? '' : 's'}.`,
        )
      }
      if (result.skipped > 0) {
        parts.push(`${result.skipped} omitido${result.skipped === 1 ? '' : 's'} por datos incompletos.`)
      }
      toast(parts.join(' '))
      setOutcome({ imported, duplicated })
      setDone(true)
    } catch (error) {
      console.error('[electro-crm] Error al importar productos:', error)
      toast.error('No se pudieron importar los productos.')
    }
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
            onClick={close}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="glass-strong my-4 w-[95%] max-w-lg rounded-2xl p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                    <UploadCloud className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Importar productos</h3>
                    <p className="text-xs text-secondary">Desde archivo CSV</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg p-1.5 text-secondary hover:bg-card hover:text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!result && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFile(file)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={parsing}
                    className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-app bg-card/40 px-4 py-6 text-center transition-colors hover:border-emerald-400/50 hover:bg-card disabled:opacity-60"
                  >
                    <FileUp className="h-8 w-8 text-emerald-300" />
                    <span className="text-sm font-semibold text-white">
                      {parsing ? 'Leyendo archivo…' : 'Seleccionar archivo CSV'}
                    </span>
                    <span className="text-xs text-muted">
                      Solo archivos .csv · compatible con Tiendanube
                    </span>
                  </button>

                  <div className="mt-4 rounded-xl border border-app bg-card/60 p-4 text-xs leading-relaxed text-secondary">
                    <p className="mb-1 font-semibold text-white">Columnas del CSV:</p>
                    <p>
                      <span className="font-semibold text-emerald-300">Nombre</span> y{' '}
                      <span className="font-semibold text-emerald-300">Precio</span> son
                      obligatorias.
                    </p>
                    <p className="mt-1">
                      Opcionales: <span className="text-primary">Stock</span>,{' '}
                      <span className="text-primary">Categoría</span>,{' '}
                      <span className="text-primary">Marca</span>,{' '}
                      <span className="text-primary">Código de barras</span> y{' '}
                      <span className="text-primary">Descripción</span>. Las filas sin nombre o sin
                      precio válido se omiten.
                    </p>
                  </div>
                </>
              )}

              {result && !done && (
                <div className="space-y-3">
                  <p className="text-xs text-secondary">
                    Archivo: <span className="font-semibold text-white">{fileName}</span>
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-app bg-card p-3">
                    <span className="text-sm text-secondary">Productos válidos</span>
                    <span className="text-lg font-bold text-emerald-300">
                      {result.products.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-app bg-card p-3">
                    <span className="text-sm text-secondary">Duplicados en el catálogo</span>
                    <span className="flex items-center gap-1.5 text-lg font-bold text-amber-300">
                      {duplicateCount > 0 && <AlertTriangle className="h-4 w-4" />}
                      {duplicateCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-app bg-card p-3">
                    <span className="text-sm text-secondary">Omitidos (datos incompletos)</span>
                    <span className="text-lg font-bold text-amber-300">{result.skipped}</span>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="max-h-28 overflow-y-auto rounded-xl border border-app bg-card/60 p-3 text-xs text-secondary">
                      {result.errors.slice(0, 5).map((e, i) => (
                        <p key={i} className="truncate">
                          ⚠️ {e}
                        </p>
                      ))}
                      {result.errors.length > 5 && (
                        <p className="text-muted">… y {result.errors.length - 5} más</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={close}
                      className="glass glass-hover flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-3 text-sm font-medium text-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={importableCount === 0}
                      className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Importar {importableCount} producto
                      {importableCount === 1 ? '' : 's'}
                    </button>
                  </div>
                </div>
              )}

              {result && done && (
                <div className="space-y-3">
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">
                      ✅ {outcome?.imported ?? 0} producto{(outcome?.imported ?? 0) === 1 ? '' : 's'} importado
                      {(outcome?.imported ?? 0) === 1 ? '' : 's'} correctamente.
                    </p>
                    {(outcome?.duplicated ?? 0) > 0 && (
                      <p className="text-xs font-medium text-amber-300">
                        ⚠️ {outcome?.duplicated} producto{outcome?.duplicated === 1 ? '' : 's'} saltado
                        {outcome?.duplicated === 1 ? '' : 's'} por estar duplicado
                        {outcome?.duplicated === 1 ? '' : 's'}.
                      </p>
                    )}
                    {result.skipped > 0 && (
                      <p className="text-xs text-secondary">
                        {result.skipped} producto{result.skipped === 1 ? '' : 's'} omitido
                        {result.skipped === 1 ? '' : 's'} por datos incompletos.
                      </p>
                    )}
                  </div>
                  <p className="text-center text-[11px] text-muted">
                    Podés editar cada producto después para completar precios de costo o detalles.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-95"
                  >
                    Listo
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

