import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import { getTodayVsYesterday } from '../../utils/stats'
import { formatMoney } from '../../utils/format'

export default function TodayVsYesterdayCard() {
  const sales = useSalesStore((s) => s.sales)

  const data = useMemo(() => getTodayVsYesterday(sales), [sales])

  const diff = data.todayTotal - data.yesterdayTotal
  const trend: 'up' | 'down' | 'flat' =
    diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  // Porcentaje relativo a las ventas de ayer (si ayer no hubo ventas pero hoy sí, 100%)
  const pct =
    data.yesterdayTotal > 0
      ? (diff / data.yesterdayTotal) * 100
      : data.todayTotal > 0
        ? 100
        : 0

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor =
    trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-secondary'

  return (
    <section className="glass glass-hover flex h-full flex-col p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Hoy vs. ayer</h3>
          <p className="text-xs text-secondary">Ventas pagadas y entregadas</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <CalendarDays className="h-5 w-5" />
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center gap-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-secondary">Hoy</p>
            <p className="mt-1 text-2xl font-bold text-white">{formatMoney(data.todayTotal)}</p>
            <p className="mt-1 text-xs text-secondary">{data.todayUnits} unidades vendidas</p>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-secondary">Ayer</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatMoney(data.yesterdayTotal)}
            </p>
            <p className="mt-1 text-xs text-secondary">{data.yesterdayUnits} unidades vendidas</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
            trend === 'up'
              ? 'border-emerald-500/25 bg-emerald-500/10'
              : trend === 'down'
                ? 'border-rose-500/25 bg-rose-500/10'
                : 'border-app bg-card'
          }`}
        >
          <span className="text-xs font-medium text-secondary">Diferencia</span>
          <span className={`flex items-center gap-1.5 text-sm font-bold ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            {diff >= 0 ? '+' : ''}
            {formatMoney(diff)} ({pct >= 0 ? '+' : ''}
            {pct.toFixed(1)}%)
          </span>
        </motion.div>
      </div>
    </section>
  )
}
