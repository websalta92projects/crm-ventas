export interface Product {
  id: string
  name: string
  description: string
  category: string
  price: number
  cost: number
  stock: number
  emoji: string
}

// Estado de una venta (Fase 5: 4 estados)
export type SaleStatus = 'pendiente_pago' | 'pagado' | 'entregado' | 'cancelado'

export interface SaleItem {
  productId: string
  name: string
  emoji: string
  quantity: number
  unitPrice: number
  unitCost: number
}

export interface Sale {
  id: string
  items: SaleItem[]
  customerId: string
  status: SaleStatus
  date: string
  budgetId?: string
  receiptNumber?: number
}

// Estados de un presupuesto
export type BudgetStatus = 'borrador' | 'enviado' | 'aceptado' | 'rechazado'

export interface BudgetItem {
  productId: string
  name: string
  emoji: string
  quantity: number
  unitPrice: number
}

export interface Budget {
  id: string
  number: number
  customerId: string
  items: BudgetItem[]
  subtotal: number
  tax: number
  total: number
  status: BudgetStatus
  createdAt: string
  updatedAt: string
  // true cuando el presupuesto ya generó una venta (evita duplicados)
  hasSale?: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
  createdAt: string
}

// Configuración de la empresa para documentos PDF (clave: company-config)
export interface CompanyConfig {
  logo: string
  name: string
  subtitle: string
  address: string
  phone: string
  email: string
  color: string
  footer: string
  budgetCounter: number
  receiptCounter: number
}

export interface TopProduct {
  product: Product
  quantity: number
  revenue: number
}

export interface SalesSummary {
  todayTotal: number
  todayCount: number
  monthTotal: number
  monthCount: number
  monthProfit: number
  topProducts: TopProduct[]
}

export interface DailyPoint {
  key: string
  label: string
  total: number
  profit: number
  count: number
}

// Vistas de la app (navegación simple sin router)
export type View =
  | 'dashboard'
  | 'productos'
  | 'ventas'
  | 'presupuestos'
  | 'clientes'
  | 'reportes'
  | 'configuracion'
