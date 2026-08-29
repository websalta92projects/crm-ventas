import type { SaleStatus } from '../types'

// Estados posibles de una venta
export const SALE_STATUSES: SaleStatus[] = [
  'pendiente_pago',
  'pagado',
  'entregado',
  'cancelado',
]

export const STATUS_META: Record<SaleStatus, { label: string; badge: string; dot: string }> = {
  pendiente_pago: {
    label: 'Pendiente de pago',
    badge: 'bg-amber-500/15 text-amber-300',
    dot: 'bg-amber-400',
  },
  pagado: { label: 'Pagado', badge: 'bg-sky-500/15 text-sky-300', dot: 'bg-sky-400' },
  entregado: { label: 'Entregado', badge: 'bg-emerald-500/15 text-emerald-300', dot: 'bg-emerald-400' },
  cancelado: { label: 'Cancelado', badge: 'bg-rose-500/15 text-rose-300', dot: 'bg-rose-400' },
}
