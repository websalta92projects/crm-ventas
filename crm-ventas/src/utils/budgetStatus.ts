import type { BudgetStatus } from '../types'

// Estados posibles de un presupuesto
export const BUDGET_STATUSES: BudgetStatus[] = ['borrador', 'enviado', 'aceptado', 'rechazado']

export const BUDGET_STATUS_META: Record<
  BudgetStatus,
  { label: string; badge: string; dot: string }
> = {
  borrador: { label: 'Borrador', badge: 'bg-slate-500/15 text-slate-300', dot: 'bg-slate-400' },
  enviado: { label: 'Enviado', badge: 'bg-sky-500/15 text-sky-300', dot: 'bg-sky-400' },
  aceptado: { label: 'Aceptado', badge: 'bg-emerald-500/15 text-emerald-300', dot: 'bg-emerald-400' },
  rechazado: { label: 'Rechazado', badge: 'bg-rose-500/15 text-rose-300', dot: 'bg-rose-400' },
}
