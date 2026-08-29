import type { DailyPoint, Product, Sale, SalesSummary, TopProduct } from '../types'
import { formatDayLabel } from './format'

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

// Resumen del Dashboard: SOLO considera ventas PAGADAS
export function getSalesSummary(
  sales: Sale[],
  products: Product[],
  now: Date = new Date(),
): SalesSummary {
  let todayTotal = 0
  let todayCount = 0
  let monthTotal = 0
  let monthCount = 0
  let monthProfit = 0
  const byProduct = new Map<string, { quantity: number; revenue: number }>()

  for (const sale of sales) {
    if (sale.status !== 'pagado') continue
    const date = new Date(sale.date)

    let saleTotal = 0
    let saleProfit = 0
    let saleUnits = 0
    for (const item of sale.items) {
      saleTotal += item.unitPrice * item.quantity
      saleProfit += (item.unitPrice - item.unitCost) * item.quantity
      saleUnits += item.quantity

      const daysAgo = (now.getTime() - startOfDay(date).getTime()) / 86_400_000
      if (daysAgo >= 0 && daysAgo < 30) {
        const agg = byProduct.get(item.productId) ?? { quantity: 0, revenue: 0 }
        agg.quantity += item.quantity
        agg.revenue += item.unitPrice * item.quantity
        byProduct.set(item.productId, agg)
      }
    }

    if (isSameDay(date, now)) {
      todayTotal += saleTotal
      todayCount += saleUnits
    }
    if (isSameMonth(date, now)) {
      monthTotal += saleTotal
      monthCount += saleUnits
      monthProfit += saleProfit
    }
  }

  const topProducts: TopProduct[] = [...byProduct.entries()]
    .map(([productId, agg]) => {
      const product = products.find((p) => p.id === productId)
      return product ? { product, quantity: agg.quantity, revenue: agg.revenue } : null
    })
    .filter((p): p is TopProduct => p !== null)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  return {
    todayTotal,
    todayCount,
    monthTotal,
    monthCount,
    monthProfit,
    topProducts,
  }
}

export function getDailySeries(sales: Sale[], days = 30, now = new Date()): DailyPoint[] {
  const points: DailyPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))
    points.push({
      key: day.getTime().toString(),
      label: formatDayLabel(day),
      total: 0,
      profit: 0,
      count: 0,
    })
  }

  const map = new Map(points.map((p) => [p.key, p]))
  for (const sale of sales) {
    if (sale.status !== 'pagado') continue
    const key = startOfDay(new Date(sale.date)).getTime().toString()
    const point = map.get(key)
    if (!point) continue
    for (const item of sale.items) {
      point.total += item.unitPrice * item.quantity
      point.profit += (item.unitPrice - item.unitCost) * item.quantity
      point.count += item.quantity
    }
  }
  return points
}
