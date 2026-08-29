import type { BudgetStatus, SaleStatus } from '../../types'
import { STATUS_META } from '../../utils/saleStatus'
import { BUDGET_STATUS_META } from '../../utils/budgetStatus'

type AnyStatus = SaleStatus | BudgetStatus

// Badge genérico para estados de ventas y presupuestos
export default function StatusBadge({
  status,
  compact = false,
}: {
  status: AnyStatus
  /** Modo compacto: muestra solo el círculo de color (sin texto). */
  compact?: boolean
}) {
  const saleMeta = (
    STATUS_META as Record<string, { label: string; badge: string; dot: string }>
  )[status]
  const meta = saleMeta ?? (BUDGET_STATUS_META as Record<string, typeof saleMeta>)[status]
  if (!meta) return null
  if (compact) {
    return (
      <span
        title={meta.label}
        aria-label={meta.label}
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`}
      />
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}
