import { useRef, type ReactNode } from 'react'
import {
  Database,
  FileDown,
  FileSpreadsheet,
  FileText,
  FolderDown,
  FolderUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSalesStore } from '../../store/salesStore'
import {
  exportBackupJSON,
  exportBudgetsCSV,
  exportCustomersCSV,
  exportProductsCSV,
  exportReportPDF,
  exportSalesCSV,
  parseBackupJSON,
} from '../../utils/export'
import type { Budget, Customer, Product, Sale } from '../../types'

interface BackupPanelProps {
  products: Product[]
  sales: Sale[]
  customers: Customer[]
  budgets: Budget[]
  from: string
  to: string
}

export default function BackupPanel({
  products,
  sales,
  customers,
  budgets,
  from,
  to,
}: BackupPanelProps) {
  const restoreData = useSalesStore((s) => s.restoreData)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = parseBackupJSON(text)
      restoreData(data)
      toast.success('Respaldo importado correctamente 🎉')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo importar el archivo')
    } finally {
      e.target.value = ''
    }
  }

  const handlePdf = async () => {
    try {
      await exportReportPDF({ products, sales, customers, from, to })
      toast.success('PDF generado 📄')
    } catch {
      toast.error('No se pudo generar el PDF')
    }
  }

  return (
    <section className="glass glass-hover p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Exportación y respaldo</h3>
          <p className="text-xs text-slate-400">CSV, PDF y respaldo JSON de tus datos</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
          <Database className="h-5 w-5" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* CSV */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            CSV (Excel)
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton label="Productos" onClick={() => exportProductsCSV(products)} />
            <ActionButton label="Ventas" onClick={() => exportSalesCSV(sales, products, customers)} />
            <ActionButton label="Clientes" onClick={() => exportCustomersCSV(customers)} />
            <ActionButton label="Presupuestos" onClick={() => exportBudgetsCSV(budgets, customers)} />
          </div>
        </div>

        {/* PDF */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <FileText className="h-4 w-4 text-rose-400" />
            PDF
          </div>
          <ActionButton label="Resumen ejecutivo" onClick={handlePdf} primary />
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Indicadores del período, top productos, top clientes y stock bajo.
          </p>
        </div>

        {/* JSON */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <FileDown className="h-4 w-4 text-sky-400" />
            Respaldo JSON
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              label="Exportar todo"
              icon={<FolderDown className="h-3.5 w-3.5" />}
              onClick={() => {
                exportBackupJSON({ products, sales, customers, budgets })
                toast.success('Respaldo exportado 💾')
              }}
            />
            <ActionButton
              label="Importar"
              icon={<FolderUp className="h-3.5 w-3.5" />}
              onClick={() => fileRef.current?.click()}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            El respaldo incluye productos, ventas y clientes. Al importar se reemplaza todo.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>
    </section>
  )
}

function ActionButton({
  label,
  onClick,
  icon,
  primary = false,
}: {
  label: string
  onClick: () => void
  icon?: ReactNode
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95 ${
        primary
          ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 hover:brightness-110'
          : 'border border-white/10 bg-white/[0.05] text-slate-300 hover:border-white/20 hover:bg-white/[0.1]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
