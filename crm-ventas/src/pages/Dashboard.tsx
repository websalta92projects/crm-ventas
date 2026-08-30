import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ClipboardList, ShoppingCart, Trophy, Wallet } from 'lucide-react'
import KpiCard from '../components/dashboard/KpiCard'
import SalesChart from '../components/dashboard/SalesChart'
import TopProductsChart from '../components/dashboard/TopProductsChart'
import SalesByCategoryChart from '../components/dashboard/SalesByCategoryChart'
import LowStockAlerts from '../components/dashboard/LowStockAlerts'
import TodayVsYesterdayCard from '../components/dashboard/TodayVsYesterdayCard'
import TopCustomersList from '../components/dashboard/TopCustomersList'
import RecentSales from '../components/dashboard/RecentSales'
import { useSalesStore } from '../store/salesStore'
import { getSalesSummary } from '../utils/stats'
import { formatMoney } from '../utils/format'
import type { View } from '../types'

interface DashboardProps {
  onNavigate?: (view: View) => void
  onSearchCustomer?: (customerName: string) => void
}

export default function Dashboard({ onNavigate, onSearchCustomer }: DashboardProps) {
  const sales = useSalesStore((s) => s.sales)
  const products = useSalesStore((s) => s.products)
  const budgets = useSalesStore((s) => s.budgets)

  const summary = useMemo(() => getSalesSummary(sales, products), [sales, products])
  const bestProduct = summary.topProducts[0]
  const margin =
    summary.monthTotal > 0 ? ((summary.monthProfit / summary.monthTotal) * 100).toFixed(1) : '0.0'

  // Presupuestos activos = Enviados + Aceptados
  const activeBudgets = useMemo(
    () => budgets.filter((b) => b.status === 'enviado' || b.status === 'aceptado').length,
    [budgets],
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="Presupuestos activos"
          value={String(activeBudgets)}
          subtitle="Enviados y aceptados"
          icon={ClipboardList}
          gradient="from-violet-500 to-indigo-600"
          delay={0}
        />
        <KpiCard
          title="Ventas de hoy"
          value={formatMoney(summary.todayTotal)}
          subtitle={`${summary.todayCount} unidades vendidas hoy`}
          icon={ShoppingCart}
          gradient="from-sky-500 to-blue-600"
          delay={0.06}
        />
        <KpiCard
          title="Ventas del mes"
          value={formatMoney(summary.monthTotal)}
          subtitle={`${summary.monthCount} unidades este mes`}
          icon={CalendarDays}
          gradient="from-violet-500 to-purple-600"
          delay={0.06}
        />
        <KpiCard
          title="Ganancia neta"
          value={formatMoney(summary.monthProfit)}
          subtitle={`Margen del ${margin}% sobre ventas`}
          icon={Wallet}
          gradient="from-emerald-500 to-teal-600"
          delay={0.12}
        />
        <KpiCard
          title="Producto estrella"
          value={bestProduct ? bestProduct.product.name : '—'}
          subtitle={
            bestProduct
              ? `${bestProduct.quantity} unidades · ${formatMoney(bestProduct.revenue)}`
              : 'Sin datos'
          }
          icon={Trophy}
          gradient="from-amber-500 to-orange-600"
          delay={0.18}
        />
      </div>

      {/* Gráfico principal + ventas por categoría */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesChart />
        </div>
        <SalesByCategoryChart />
      </div>

      {/* Top productos + comparativa hoy/ayer + alertas de stock */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <TopProductsChart />
        <TodayVsYesterdayCard />
        <LowStockAlerts onGoToProducts={() => onNavigate?.('productos')} />
      </div>

      {/* Clientes frecuentes + últimas ventas */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <TopCustomersList onSelect={(name) => onSearchCustomer?.(name)} />
        <div className="xl:col-span-2">
          <RecentSales />
        </div>
      </div>
    </motion.div>
  )
}

