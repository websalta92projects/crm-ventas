import type { BudgetStatus, SaleStatus } from '../../types'
import { STATUS_META } from '../../utils/saleStatus'
import { BUDGET_STATUS_META } from '../../utils/budgetStatus'

type AnyStatus = SaleStatus | BudgetStatus

// Badge genérico para estados de ventas y presupuestos
export default function StatusBadge({ status }: { status: AnyStatus }) {
  const saleMeta = (
    STATUS_META as Record<string, { label: string; badge: string; dot: string }>
  )[status]
  const meta = saleMeta ?? (BUDGET_STATUS_META as Record<string, typeof saleMeta>)[status]
  if (!meta) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}
