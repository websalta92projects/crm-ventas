import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { AlertTriangle, Building2, FileText, ImageUp, RotateCcw, Save } from 'lucide-react'
import { useConfigStore } from '../store/configStore'
import { useSalesStore } from '../store/salesStore'
import ConfirmModal from '../components/products/ConfirmModal'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60'

export default function Settings() {
  const config = useConfigStore((s) => s.config)
  const updateConfig = useConfigStore((s) => s.updateConfig)
  const resetConfig = useConfigStore((s) => s.resetConfig)
  const fileRef = useRef<HTMLInputElement>(null)
  const clearAllData = useSalesStore((s) => s.clearAllData)
  const [resetOpen, setResetOpen] = useState(false)

  // Reseteo total: deja el CRM vacío, borra configuración y categorías, y recarga la página
  const handleResetAll = () => {
    // clearAllData persiste un estado vacío en 'electro-crm-v1' (así no reaparecen los datos demo)
    clearAllData()
    localStorage.removeItem('company-config')
    localStorage.removeItem('categories')
    toast.success('✅ Todos los datos han sido eliminados. La página se recargará.')
    setTimeout(() => window.location.reload(), 1200)
  }

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) {
      toast.error('La imagen no puede superar 1 MB')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updateConfig({ logo: String(reader.result) })
      toast.success('Logo cargado 🖼️')
    }
    reader.readAsDataURL(file)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-3xl space-y-5"
    >
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Configuración de la empresa</h2>
          <p className="text-xs text-slate-400">
            Estos datos se usan en los PDF de presupuestos y recibos
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetConfig()
              toast.success('Configuración restaurada 🔄')
            }}
            className="glass glass-hover flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </button>
          <button
            onClick={() => toast.success('Configuración guardada 💾')}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 hover:brightness-110 active:scale-95"
          >
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </div>

      {/* Empresa */}
      <section className="glass glass-hover p-5 md:p-6">
        <header className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Datos de la empresa</h3>
            <p className="text-[11px] text-slate-500">
              Aparecen en el encabezado de los documentos
            </p>
          </div>
        </header>

        {/* Logo */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.05]">
            {config.logo ? (
              <img src={config.logo} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-7 w-7 text-slate-500" />
            )}
          </div>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.1]"
            >
              <ImageUp className="h-4 w-4" />
              Cargar logo
            </button>
            {config.logo && (
              <button
                onClick={() => updateConfig({ logo: '' })}
                className="mt-1 block text-[11px] text-rose-400 hover:text-rose-300"
              >
                Quitar logo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={onLogo}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre de la empresa">
            <input
              value={config.name}
              onChange={(e) => updateConfig({ name: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Teléfono">
            <input
              value={config.phone}
              onChange={(e) => updateConfig({ phone: e.target.value })}
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dirección">
              <input
                value={config.address}
                onChange={(e) => updateConfig({ address: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Email">
              <input
                value={config.email}
                onChange={(e) => updateConfig({ email: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Subtítulo (opcional)">
              <input
                value={config.subtitle ?? ''}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                placeholder="Ej. Ventas inteligentes"
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Se muestra debajo del nombre en el menú lateral.
              </p>
            </Field>
          </div>
        </div>
      </section>

      {/* Documentos */}
      <section className="glass glass-hover p-5 md:p-6">
        <header className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Documentos y folios</h3>
            <p className="text-[11px] text-slate-500">
              Los contadores se incrementan automáticamente con cada documento
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Color principal">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.color}
                onChange={(e) => updateConfig({ color: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              />
              <span className="text-xs text-slate-400">{config.color}</span>
            </div>
          </Field>
          <Field label="Número de inicio presupuestos">
            <input
              type="number"
              min={1}
              value={config.budgetCounter}
              onChange={(e) =>
                updateConfig({ budgetCounter: Math.max(1, parseInt(e.target.value) || 1) })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Número de inicio recibos">
            <input
              type="number"
              min={1}
              value={config.receiptCounter}
              onChange={(e) =>
                updateConfig({ receiptCounter: Math.max(1, parseInt(e.target.value) || 1) })
              }
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Pie de página personalizado">
            <textarea
              value={config.footer}
              onChange={(e) => updateConfig({ footer: e.target.value })}
              rows={2}
              placeholder="Ej. ¡Gracias por confiar en nosotros! o ElectroTech - Calidad y confianza"
              className={`${inputClass} resize-none`}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Aparece al final de presupuestos y recibos. Si lo dejas vacío, se usará «Generado con
              ElectroCRM».
            </p>
          </Field>
        </div>

        {/* Vista previa */}
        <div className="mt-5">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Vista previa</p>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ backgroundColor: config.color }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-sm font-bold">
                {(config.name.trim()[0] ?? 'E').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{config.name}</p>
                <p className="truncate text-[11px] text-white/80">
                  {config.address} · {config.phone}
                </p>
              </div>
              <p className="ml-auto shrink-0 rounded-md bg-white/20 px-2 py-1 text-[11px] font-bold text-white">
                PRESUPUESTO #{config.budgetCounter}
              </p>
            </div>
            <div className="flex items-center justify-between px-4 py-2 text-[11px] text-slate-400">
              <span>Cliente: … · Fecha: …</span>
              <span>{config.footer || 'Pie de página'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Zona de peligro */}
      <section className="rounded-xl border border-rose-500/30 bg-rose-500/[0.05] p-5 md:p-6">
        <header className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-rose-300">Zona de peligro</h3>
            <p className="text-[11px] text-slate-400">Estas acciones no se pueden deshacer</p>
          </div>
        </header>

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-200">Resetear todos los datos</p>
            <p className="text-xs text-slate-400">
              Elimina productos, clientes, presupuestos, ventas y configuración.
            </p>
          </div>
          <button
            onClick={() => setResetOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-300 transition-all hover:bg-rose-500/25 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            Resetear todos los datos
          </button>
        </div>
      </section>

      <ConfirmModal
        open={resetOpen}
        title="Resetear todos los datos"
        message="⚠️ ¿Estás seguro? Esto eliminará TODOS los productos, clientes, presupuestos, ventas y configuraciones. Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar todo"
        onConfirm={handleResetAll}
        onClose={() => setResetOpen(false)}
      />
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}
