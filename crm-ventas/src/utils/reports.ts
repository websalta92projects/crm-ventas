import type { Customer, Product, Sale } from '../types'

// ===== Agregaciones para la vista de Reportes (Fase 4 / multi-producto) =====
// Las ventas CANCELADAS se excluyen de los ingresos y ganancias.

export interface MonthlyPoint {
  key: string
  label: string
  total: number
  profit: number
  count: number
}

export interface NameValue {
  name: string
  value: number
  revenue: number
}

export interface TopCustomer {
  customer: Customer
  purchases: number
  items: number
  total: number
}

const monthFormatter = new Intl.DateTimeFormat('es', { month: 'short', year: '2-digit' })

const isCounted = (s: Sale) => s.status !== 'cancelado'

export function getMonthlySeries(sales: Sale[]): MonthlyPoint[] {
  const map = new Map<string, MonthlyPoint>()
  for (const s of sales) {
    if (!isCounted(s)) continue
    const d = new Date(s.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    let point = map.get(key)
    if (!point) {
      point = { key, label: monthFormatter.format(d), total: 0, profit: 0, count: 0 }
      map.set(key, point)
    }
    for (const item of s.items) {
      point.total += item.unitPrice * item.quantity
      point.profit += (item.unitPrice - item.unitCost) * item.quantity
    }
    point.count += 1
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export function getPeriodSummary(sales: Sale[], from: string, to: string) {
  let total = 0
  let profit = 0
  let count = 0
  let items = 0
  const activeCustomers = new Set<string>()

  for (const s of sales) {
    if (!isCounted(s)) continue
    const day = s.date.slice(0, 10)
    if ((!from || day >= from) && (!to || day <= to)) {
      let saleTotal = 0
      for (const item of s.items) {
        saleTotal += item.unitPrice * item.quantity
        profit += (item.unitPrice - item.unitCost) * item.quantity
        items += item.quantity
      }
      total += saleTotal
      count += 1
      if (s.customerId) activeCustomers.add(s.customerId)
    }
  }

  return {
    total,
    profit,
    count,
    items,
    activeCustomers: activeCustomers.size,
    margin: total > 0 ? (profit / total) * 100 : 0,
  }
}

export function getSalesByProduct(sales: Sale[], products: Product[], limit = 6): NameValue[] {
  const map = new Map<string, NameValue>()
  for (const s of sales) {
    if (!isCounted(s)) continue
    for (const item of s.items) {
      const product = products.find((p) => p.id === item.productId)
      const name = product?.name ?? 'Producto eliminado'
      const agg = map.get(item.productId) ?? { name, value: 0, revenue: 0 }
      agg.value += item.quantity
      agg.revenue += item.unitPrice * item.quantity
      map.set(item.productId, agg)
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

export function getSalesByCustomer(sales: Sale[], customers: Customer[], limit = 6): NameValue[] {
  const map = new Map<string, NameValue>()
  for (const s of sales) {
    if (!isCounted(s) || !s.customerId) continue
    const customer = customers.find((c) => c.id === s.customerId)
    const name = customer?.name ?? 'Cliente eliminado'
    const agg = map.get(s.customerId) ?? { name, value: 0, revenue: 0 }
    for (const item of s.items) {
      agg.value += item.quantity
      agg.revenue += item.unitPrice * item.quantity
    }
    map.set(s.customerId, agg)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

export function getTopCustomers(sales: Sale[], customers: Customer[], limit = 5): TopCustomer[] {
  const map = new Map<string, { purchases: number; items: number; total: number }>()
  for (const s of sales) {
    if (!isCounted(s) || !s.customerId) continue
    const agg = map.get(s.customerId) ?? { purchases: 0, items: 0, total: 0 }
    agg.purchases += 1
    for (const item of s.items) {
      agg.items += item.quantity
      agg.total += item.unitPrice * item.quantity
    }
    map.set(s.customerId, agg)
  }
  return [...map.entries()]
    .map(([id, agg]) => ({ customer: customers.find((c) => c.id === id)!, ...agg }))
    .filter((x) => Boolean(x.customer))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export function getLowStockProducts(products: Product[], threshold = 5): Product[] {
  return products.filter((p) => p.stock <= threshold).sort((a, b) => a.stock - b.stock)
}
