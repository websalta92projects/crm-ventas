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
  // Contador que sube con cada cambio de datos (mecanismo "force refresh")
  dataVersion: number

  saveSale: (data: {
    items: { productId: string; quantity: number }[]
    customerId: string
    status: SaleStatus
    date: string
    budgetId?: string
    id?: string
    // IVA del recibo (si viene de un presupuesto, se hereda de él)
    includeTax?: boolean
    taxRate?: number
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
    // IVA configurable por presupuesto
    includeTax: boolean
    taxRate: number
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
  clearAllData: () => void

}
const nowIso = () => new Date().toISOString()

// Depuración: registra cada acción del store (solo en desarrollo)
const devLog = (action: string, payload?: unknown) => {
  const env = (import.meta as unknown as { env?: { DEV?: boolean } })?.env
  // En producción (Vite) DEV=false → no se loguea; en entornos sin import.meta.env (tests) se loguea
  if (env === undefined || env.DEV === undefined || env.DEV) {
    console.log(`[electro-crm:store] ${action}`, payload ?? '')
  }
}

export const useSalesStore = create<SalesStore>()(
  persist(
    (set) => {
      // setBump: incrementa dataVersion con cada cambio real de estado.
      // Así los listados pueden forzar re-render aunque el array en sí no cambie.
      const setBump: typeof set = (partial) =>
        set((state) => {
          const next =
            typeof partial === 'function'
              ? (partial as (s: SalesStore) => Partial<SalesStore> | SalesStore)(state)
              : (partial as Partial<SalesStore>)
          // Sin cambios reales → no se incrementa el contador
          if (next === state) return state
          return { ...next, dataVersion: state.dataVersion + 1 }
        })
      return {
        products: initialProducts,
        sales: generateSeedSales(),
        customers: initialCustomers,
        budgets: initialBudgets,
        dataVersion: 0,

      // ===== VENTAS =====

      // Crea o actualiza una venta (multi-producto) ajustando stock y aceptando el presupuesto
      saveSale: (data) => {
        devLog('saveSale', data)
        return setBump((state) => {
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

          // IVA heredado del presupuesto origen (o por defecto de Configuración)
          const sourceBudget = data.budgetId
            ? state.budgets.find((b) => b.id === data.budgetId)
            : undefined
          const sale: Sale = {
            id: data.id ?? uid(),
            items,
            customerId: data.customerId,
            status: data.status,
            date: data.date,
            budgetId: data.budgetId,
            includeTax: sourceBudget ? sourceBudget.includeTax : data.includeTax ?? true,
            taxRate: sourceBudget
              ? sourceBudget.taxRate
              : data.taxRate ?? useConfigStore.getState().config.taxRate ?? 21,
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
        })
      },
      // Elimina la venta y restaura el stock de todos sus productos
      removeSale: (id) => {
        devLog('removeSale', id)
        return setBump((state) => {
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
        })
      },

      // Cambia el estado de una venta; al cancelar (o des-cancelar) ajusta el stock
      setSaleStatus: (id, status) => {
        devLog('setSaleStatus', { id, status })
        return setBump((state) => {
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
        })
      },

      // Asigna el folio del recibo a una venta pagada
      setReceiptNumber: (id, number) => {
        devLog('setReceiptNumber', { id, number })
        return setBump((state) => ({
          sales: state.sales.map((s) => (s.id === id ? { ...s, receiptNumber: number } : s)),
        }))
      },
      // ===== PRODUCTOS =====

      saveProduct: (data) => {
        devLog('saveProduct', data)
        return setBump((state) => {
          if (data.id) {
            return {
              products: state.products.map((p) =>
                p.id === data.id ? { ...data, id: data.id } : p,
              ),
            }
          }
          return { products: [...state.products, { ...data, id: uid() }] }
        })
      },

      removeProduct: (id) => {
        devLog('removeProduct', id)
        return setBump((state) => ({ products: state.products.filter((p) => p.id !== id) }))
      },

      // ===== CLIENTES =====

      saveCustomer: (data) => {
        devLog('saveCustomer', data)
        return setBump((state) => {
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
        })
      },

      removeCustomer: (id) => {
        devLog('removeCustomer', id)
        return setBump((state) => ({ customers: state.customers.filter((c) => c.id !== id) }))
      },

      // ===== PRESUPUESTOS =====

      // Crea o actualiza un presupuesto; el folio se genera desde Configuración
      saveBudget: (data) => {
        devLog('saveBudget', data)
        // El folio solo se consume al CREAR (no al editar) y se calcula ANTES del
        // set, para no hacer efectos secundarios dentro del actualizador de estado.
        const nextNumber = data.id ? undefined : useConfigStore.getState().nextBudgetNumber()
        return setBump((state) => {
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

          const { subtotal, tax, total } = budgetTotals(items, {
            includeTax: data.includeTax,
            taxRate: data.taxRate,
          })

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
                      includeTax: data.includeTax,
                      taxRate: data.taxRate,
                      updatedAt: nowIso(),
                    }
                  : b,
              ),
            }
          }

          // Folio consecutivo configurable desde "Configuración" (se incrementa solo)
          const budget: Budget = {
            id: uid(),
            number: nextNumber ?? 0,
            customerId: data.customerId,
            items,
            subtotal,
            tax,
            total,
            status: data.status,
            includeTax: data.includeTax,
            taxRate: data.taxRate,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          }
          return { budgets: [budget, ...state.budgets] }
        })
      },

      removeBudget: (id) => {
        devLog('removeBudget', id)
        return setBump((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }))
      },

      setBudgetStatus: (id, status) => {
        devLog('setBudgetStatus', { id, status })
        return setBump((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, status, updatedAt: nowIso() } : b,
          ),
        }))
      },

      // ===== DATOS =====

      restoreData: (data) => {
        devLog('restoreData', {
          counts: {
            products: data.products.length,
            sales: data.sales.length,
            customers: data.customers.length,
            budgets: data.budgets.length,
          },
        })
        return setBump({
          products: data.products,
          sales: data.sales,
          customers: data.customers,
          budgets: data.budgets,
        })
      },

      resetData: () => {
        devLog('resetData')
        return setBump({ sales: generateSeedSales() })
      },

      resetAllData: () => {
        devLog('resetAllData')
        return setBump({
          products: initialProducts,
          sales: generateSeedSales(),
          customers: initialCustomers,
          budgets: initialBudgets,
        })
      },

      // Deja el CRM con datos vacíos (para el botón "Resetear todos los datos")
      clearAllData: () => {
        devLog('clearAllData')
        return setBump({ products: [], sales: [], customers: [], budgets: [] })
      },
      }
    },
    {
      name: 'electro-crm-v1',
      // version 8: IVA configurable por presupuesto (includeTax + taxRate)
      version: 8,
      // Solo se guardan los datos (las funciones y dataVersion no se persisten)
      partialize: (state) => ({
        products: state.products,
        sales: state.sales,
        customers: state.customers,
        budgets: state.budgets,
      }),
      // Si el estado guardado viene de una versión anterior o está dañado,
      // se normaliza y la app arranca con datos válidos (sin congelarse).
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<
          Pick<SalesStore, 'products' | 'sales' | 'customers' | 'budgets'>
        >
        return {
          products: Array.isArray(p.products) ? p.products : initialProducts,
          sales: Array.isArray(p.sales) ? p.sales : generateSeedSales(),
          customers: Array.isArray(p.customers) ? p.customers : initialCustomers,
          budgets: Array.isArray(p.budgets)
            ? p.budgets.map((b) => ({
                ...b,
                includeTax: b.includeTax ?? true,
                taxRate: b.taxRate ?? 21,
              }))
            : initialBudgets,
        }
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          // Ej: localStorage no disponible o JSON corrupto → se continúa con datos iniciales
          console.warn('[electro-crm:store] Error al rehidratar los datos:', error)
        } else if (state) {
          devLog('datos rehidratados desde localStorage', {
            products: state.products.length,
            sales: state.sales.length,
            customers: state.customers.length,
            budgets: state.budgets.length,
          })
        }
      },
    },
  ),
)
