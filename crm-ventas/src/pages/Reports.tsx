import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { CalendarRange, FileText, ReceiptText, ShoppingCart, Users, Wallet } from 'lucide-react'
import KpiCard from '../components/dashboard/KpiCard'
import SalesByMonthChart from '../components/reports/SalesByMonthChart'
import SalesByProductChart from '../components/reports/SalesByProductChart'
import SalesByCustomerChart from '../components/reports/SalesByCustomerChart'
import TopCustomersList from '../components/reports/TopCustomersList'
import LowStockAlerts from '../components/reports/LowStockAlerts'
import BackupPanel from '../components/reports/BackupPanel'
import { useSalesStore } from '../store/salesStore'
import { getPeriodSummary } from '../utils/reports'
import { exportReportPDF } from '../utils/export'
import { formatMoney } from '../utils/format'

export default function Reports() {
  const products = useSalesStore((s) => s.products)
  const sales = useSalesStore((s) => s.sales)
  const customers = useSalesStore((s) => s.customers)
  const budgets = useSalesStore((s) => s.budgets)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const summary = useMemo(() => getPeriodSummary(sales, from, to), [sales, from, to])
  const avgTicket = summary.count > 0 ? summary.total / summary.count : 0

  const handlePdf = async () => {
    try {
      await exportReportPDF({ products, sales, customers, from, to })
      toast.success('PDF generado 📄')
    } catch {
      toast.error('No se pudo generar el PDF')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Selector de período + exportar PDF */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="glass flex items-center gap-2 rounded-xl px-3 py-2">
          <CalendarRange className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-sm text-slate-200 focus:outline-none [color-scheme:dark]"
          />
          <span className="text-slate-500">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-sm text-slate-200 focus:outline-none [color-scheme:dark]"
          />
        </div>

        {from || to ? (
          <span className="text-xs text-slate-400">
            {from || 'inicio'} → {to || 'hoy'}
          </span>
        ) : (
          <span className="text-xs text-slate-500">Todo el historial</span>
        )}

        <button
          onClick={handlePdf}
          className="ml-auto flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:brightness-110 active:scale-95 sm:w-auto"
        >
          <FileText className="h-4 w-4" />
          Exportar PDF
        </button>
      </div>

      {/* KPIs del período */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Ventas del período"
          value={formatMoney(summary.total)}
          subtitle={`${summary.count} pedidos · ${summary.items} artículos`}
          icon={ShoppingCart}
          gradient="from-sky-500 to-blue-600"
          delay={0}
        />
        <KpiCard
          title="Ganancia neta"
          value={formatMoney(summary.profit)}
          subtitle={`Margen del ${summary.margin.toFixed(1)}%`}
          icon={Wallet}
          gradient="from-emerald-500 to-teal-600"
          delay={0.06}
        />
        <KpiCard
          title="Ticket promedio"
          value={formatMoney(avgTicket)}
          subtitle="Venta media por pedido"
          icon={ReceiptText}
          gradient="from-violet-500 to-purple-600"
          delay={0.12}
        />
        <KpiCard
          title="Clientes activos"
          value={String(summary.activeCustomers)}
          subtitle={`${customers.length} clientes registrados`}
          icon={Users}
          gradient="from-amber-500 to-orange-600"
          delay={0.18}
        />
      </div>

      {/* Fila 1: ventas por mes + por producto */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesByMonthChart sales={sales} />
        </div>
        <SalesByProductChart sales={sales} products={products} />
      </div>

      {/* Fila 2: ventas por cliente + top 5 clientes */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesByCustomerChart sales={sales} customers={customers} />
        </div>
        <TopCustomersList sales={sales} customers={customers} />
      </div>

      {/* Alerta de stock bajo */}
      <LowStockAlerts products={products} />

      {/* Exportación y respaldo */}
      <BackupPanel
        products={products}
        sales={sales}
        customers={customers}
        budgets={budgets}
        from={from}
        to={to}
      />
    </motion.div>
  )
}
