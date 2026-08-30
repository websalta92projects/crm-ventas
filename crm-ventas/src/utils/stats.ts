import type { Customer, DailyPoint, Product, Sale, SalesSummary, TopProduct } from '../types'
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

// Resumen del Dashboard: considera ventas PAGADAS y ENTREGADAS
// (las ventas pendientes de pago NO se contabilizan)
export function isCountedSale(sale: Sale): boolean {
  return sale.status === 'pagado' || sale.status === 'entregado'
}

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
    if (!isCountedSale(sale)) continue
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
    if (!isCountedSale(sale)) continue
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

// ===== Nuevas agregaciones del Dashboard (solo ventas pagadas/entregadas) =====

export interface CategorySales {
  name: string
  value: number
  revenue: number
}

// Ventas agrupadas por categoría de producto, ordenadas por ingreso descendente.
export function getSalesByCategory(sales: Sale[], products: Product[]): CategorySales[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  const map = new Map<string, { value: number; revenue: number }>()
  for (const s of sales) {
    if (!isCountedSale(s)) continue
    for (const item of s.items) {
      const product = byId.get(item.productId)
      const cat = product?.category ?? 'Sin categoría'
      const agg = map.get(cat) ?? { value: 0, revenue: 0 }
      agg.value += item.quantity
      agg.revenue += item.unitPrice * item.quantity
      map.set(cat, agg)
    }
  }
  return [...map.entries()]
    .map(([name, agg]) => ({ name, ...agg }))
    .sort((a, b) => b.revenue - a.revenue)
}

export interface DayComparison {
  todayTotal: number
  todayUnits: number
  yesterdayTotal: number
  yesterdayUnits: number
}

// Comparativa de ventas de HOY vs AYER (solo pagadas/entregadas).
export function getTodayVsYesterday(sales: Sale[], now: Date = new Date()): DayComparison {
  const today = startOfDay(now)
  const yesterday = new Date(today.getTime() - 86_400_000)
  let todayTotal = 0
  let todayUnits = 0
  let yesterdayTotal = 0
  let yesterdayUnits = 0

  for (const s of sales) {
    if (!isCountedSale(s)) continue
    const day = startOfDay(new Date(s.date)).getTime()
    let total = 0
    let units = 0
    for (const item of s.items) {
      total += item.unitPrice * item.quantity
      units += item.quantity
    }
    if (day === today.getTime()) {
      todayTotal += total
      todayUnits += units
    } else if (day === yesterday.getTime()) {
      yesterdayTotal += total
      yesterdayUnits += units
    }
  }

  return { todayTotal, todayUnits, yesterdayTotal, yesterdayUnits }
}

export interface FrequentCustomer {
  customer: Customer
  purchases: number
  units: number
  total: number
}

// Top clientes por monto total gastado (solo ventas pagadas/entregadas).
export function getFrequentCustomers(
  sales: Sale[],
  customers: Customer[],
  limit = 5,
): FrequentCustomer[] {
  const map = new Map<string, { purchases: number; units: number; total: number }>()
  for (const s of sales) {
    if (!isCountedSale(s) || !s.customerId) continue
    const agg = map.get(s.customerId) ?? { purchases: 0, units: 0, total: 0 }
    agg.purchases += 1
    for (const item of s.items) {
      agg.units += item.quantity
      agg.total += item.unitPrice * item.quantity
    }
    map.set(s.customerId, agg)
  }
  return [...map.entries()]
    .map(([id, agg]) => {
      const customer = customers.find((c) => c.id === id)
      return customer ? { customer, ...agg } : null
    })
    .filter((x): x is FrequentCustomer => x !== null)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}
