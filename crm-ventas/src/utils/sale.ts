import type { Sale } from '../types'

// Helpers a nivel de venta (Fase 5: ventas multi-producto)

export function saleTotal(sale: Sale): number {
  return sale.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0)
}

export function saleProfit(sale: Sale): number {
  return sale.items.reduce((acc, i) => acc + (i.unitPrice - i.unitCost) * i.quantity, 0)
}

export function saleUnits(sale: Sale): number {
  return sale.items.reduce((acc, i) => acc + i.quantity, 0)
}
