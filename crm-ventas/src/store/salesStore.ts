import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Budget,
  BudgetItem,
  BudgetStatus,
  Customer,
  Product,
  Sale,
  SaleItem,
  SaleStatus,
} from '../types'
import {
  generateSeedSales,
  initialBudgets,
  initialCustomers,
  initialProducts,
  uid,
} from '../data/seedData'
import { budgetTotals } from '../utils/budget'
import { useConfigStore } from './configStore'

interface SalesStore {
  products: Product[]
  sales: Sale[]
  customers: Customer[]
  budgets: Budget[]

  saveSale: (data: {
    items: { productId: string; quantity: number }[]
    customerId: string
    status: SaleStatus
    date: string
    budgetId?: string
    id?: string
  }) => void
  removeSale: (id: string) => void
  setSaleStatus: (id: string, status: SaleStatus) => void
  setReceiptNumber: (id: string, number: number) => void

  saveProduct: (data: Omit<Product, 'id'> & { id?: string }) => void
  removeProduct: (id: string) => void

  saveCustomer: (data: Omit<Customer, 'id' | 'createdAt'> & { id?: string }) => void
  removeCustomer: (id: string) => void

  saveBudget: (data: {
    customerId: string
    items: { productId: string; quantity: number }[]
    status: BudgetStatus
    id?: string
  }) => void
  removeBudget: (id: string) => void
  setBudgetStatus: (id: string, status: BudgetStatus) => void

  restoreData: (data: {
    products: Product[]
    sales: Sale[]
    customers: Customer[]
    budgets: Budget[]
  }) => void
  resetData: () => void
  resetAllData: () => void
}
const nowIso = () => new Date().toISOString()

export const useSalesStore = create<SalesStore>()(
  persist(
    (set) => ({
      products: initialProducts,
      sales: generateSeedSales(),
      customers: initialCustomers,
      budgets: initialBudgets,

      // ===== VENTAS =====

      // Crea o actualiza una venta (multi-producto) ajustando stock y aceptando el presupuesto
      saveSale: (data) =>
        set((state) => {
          const items: SaleItem[] = data.items
            .map((it) => {
              const p = state.products.find((x) => x.id === it.productId)
              if (!p) return null
              return {
                productId: p.id,
                name: p.name,
                emoji: p.emoji,
                quantity: it.quantity,
                unitPrice: p.price,
                unitCost: p.cost,
              }
            })
            .filter((x): x is SaleItem => x !== null)
          if (items.length === 0) return state

          const sale: Sale = {
            id: data.id ?? uid(),
            items,
            customerId: data.customerId,
            status: data.status,
            date: data.date,
            budgetId: data.budgetId,
          }

          // Si la venta nace de un presupuesto, ese presupuesto pasa a "Aceptado"
          // y se marca con hasSale para evitar ventas duplicadas desde el mismo presupuesto.
          const markBudgetSale = (
            budgets: Budget[],
            newBudgetId?: string,
            oldBudgetId?: string,
          ) =>
            budgets.map((b) => {
              if (newBudgetId && b.id === newBudgetId) {
                return {
                  ...b,
                  status: 'aceptado' as BudgetStatus,
                  hasSale: true,
                  updatedAt: nowIso(),
                }
              }
              if (oldBudgetId && b.id === oldBudgetId) {
                return { ...b, hasSale: false, updatedAt: nowIso() }
              }
              return b
            })

          const deduct = (products: Product[], mult: number) => {
            let next = products
            for (const item of items) {
              next = next.map((p) =>
                p.id === item.productId
                  ? { ...p, stock: Math.max(0, p.stock - item.quantity * mult) }
                  : p,
              )
            }
            return next
          }

          // --- Edición: restaura stock del original y descuenta el nuevo ---
          if (data.id) {
            const existing = state.sales.find((s) => s.id === data.id)
            if (!existing) return state
            const products = deduct(deduct(state.products, -1), 1)
            return {
              sales: state.sales.map((s) => (s.id === data.id ? sale : s)),
              products,
              budgets: markBudgetSale(state.budgets, data.budgetId, existing.budgetId),
            }
          }

          // --- Creación ---
          return {
            sales: [sale, ...state.sales],
            products: deduct(state.products, 1),
            budgets: markBudgetSale(state.budgets, data.budgetId),
          }
        }),
      // Elimina la venta y restaura el stock de todos sus productos
      removeSale: (id) =>
        set((state) => {
          const sale = state.sales.find((s) => s.id === id)
          if (!sale) return state
          let products = state.products
          for (const item of sale.items) {
            products = products.map((p) =>
              p.id === item.productId ? { ...p, stock: p.stock + item.quantity } : p,
            )
          }
          // Si la venta venía de un presupuesto, ese presupuesto vuelve a ser convertible
          const budgets = sale.budgetId
            ? state.budgets.map((b) =>
                b.id === sale.budgetId ? { ...b, hasSale: false, updatedAt: nowIso() } : b,
              )
            : state.budgets
          return { sales: state.sales.filter((s) => s.id !== id), products, budgets }
        }),

      // Cambia el estado de una venta; al cancelar (o des-cancelar) ajusta el stock
      setSaleStatus: (id, status) =>
        set((state) => {
          const sale = state.sales.find((s) => s.id === id)
          if (!sale || sale.status === status) return state

          let products = state.products
          const restoring = status === 'cancelado' && sale.status !== 'cancelado'
          const reDeducting = sale.status === 'cancelado' && status !== 'cancelado'
          if (restoring || reDeducting) {
            for (const item of sale.items) {
              products = products.map((p) =>
                p.id === item.productId
                  ? {
                      ...p,
                      stock: Math.max(0, p.stock + (restoring ? item.quantity : -item.quantity)),
                    }
                  : p,
              )
            }
          }
          return {
            sales: state.sales.map((s) => (s.id === id ? { ...s, status } : s)),
            products,
          }
        }),

      // Asigna el folio del recibo a una venta pagada
      setReceiptNumber: (id, number) =>
        set((state) => ({
          sales: state.sales.map((s) => (s.id === id ? { ...s, receiptNumber: number } : s)),
        })),
      // ===== PRODUCTOS =====

      saveProduct: (data) =>
        set((state) => {
          if (data.id) {
            return {
              products: state.products.map((p) =>
                p.id === data.id ? { ...data, id: data.id } : p,
              ),
            }
          }
          return { products: [...state.products, { ...data, id: uid() }] }
        }),

      removeProduct: (id) =>
        set((state) => ({ products: state.products.filter((p) => p.id !== id) })),

      // ===== CLIENTES =====

      saveCustomer: (data) =>
        set((state) => {
          if (data.id) {
            return {
              customers: state.customers.map((c) =>
                c.id === data.id ? { ...c, ...data, id: data.id } : c,
              ),
            }
          }
          return {
            customers: [...state.customers, { ...data, id: uid(), createdAt: nowIso() }],
          }
        }),

      removeCustomer: (id) =>
        set((state) => ({ customers: state.customers.filter((c) => c.id !== id) })),

      // ===== PRESUPUESTOS =====

      // Crea o actualiza un presupuesto; el folio se genera desde Configuración
      saveBudget: (data) =>
        set((state) => {
          const items: BudgetItem[] = data.items
            .map((it) => {
              const p = state.products.find((x) => x.id === it.productId)
              if (!p) return null
              return {
                productId: p.id,
                name: p.name,
                emoji: p.emoji,
                quantity: it.quantity,
                unitPrice: p.price,
              }
            })
            .filter((x): x is BudgetItem => x !== null)
          if (items.length === 0) return state

          const { subtotal, tax, total } = budgetTotals(items)

          if (data.id) {
            return {
              budgets: state.budgets.map((b) =>
                b.id === data.id
                  ? {
                      ...b,
                      customerId: data.customerId,
                      items,
                      subtotal,
                      tax,
                      total,
                      status: data.status,
                      updatedAt: nowIso(),
                    }
                  : b,
              ),
            }
          }

          // Folio consecutivo configurable desde "Configuración" (se incrementa solo)
          const nextNumber = useConfigStore.getState().nextBudgetNumber()
          const budget: Budget = {
            id: uid(),
            number: nextNumber,
            customerId: data.customerId,
            items,
            subtotal,
            tax,
            total,
            status: data.status,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          }
          return { budgets: [budget, ...state.budgets] }
        }),

      removeBudget: (id) =>
        set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) })),

      setBudgetStatus: (id, status) =>
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, status, updatedAt: nowIso() } : b,
          ),
        })),

      // ===== DATOS =====

      restoreData: (data) =>
        set({
          products: data.products,
          sales: data.sales,
          customers: data.customers,
          budgets: data.budgets,
        }),

      resetData: () => set({ sales: generateSeedSales() }),

      resetAllData: () =>
        set({
          products: initialProducts,
          sales: generateSeedSales(),
          customers: initialCustomers,
          budgets: initialBudgets,
        }),
    }),
    {
      name: 'electro-crm-v1',
      // version 6: folios desde configuración + número de recibo (Fase 6)
      version: 6,
    },
  ),
)
