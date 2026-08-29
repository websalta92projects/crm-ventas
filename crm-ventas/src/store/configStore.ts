import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CompanyConfig } from '../types'

// Configuración de la empresa (persistida en localStorage con la clave 'company-config')
export const DEFAULT_CONFIG: CompanyConfig = {
  logo: '',
  name: 'ElectroCRM',
  subtitle: 'Ventas inteligentes',
  address: 'Av. Principal 123, Buenos Aires',
  phone: '5491122334455',
  email: 'ventas@electrotech.com',
  color: '#8b5cf6',
  footer: 'Generado con ElectroCRM',
  budgetCounter: 1001,
  receiptCounter: 1458,
  taxRate: 21,
}

interface ConfigStore {
  config: CompanyConfig
  updateConfig: (partial: Partial<CompanyConfig>) => void
  resetConfig: () => void
  // Devuelve el folio actual e incrementa el contador automáticamente
  nextBudgetNumber: () => number
  nextReceiptNumber: () => number
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,

      updateConfig: (partial) =>
        set((state) => ({ config: { ...state.config, ...partial } })),

      resetConfig: () => set({ config: DEFAULT_CONFIG }),

      nextBudgetNumber: () => {
        const n = get().config.budgetCounter
        set((state) => ({
          config: { ...state.config, budgetCounter: state.config.budgetCounter + 1 },
        }))
        return n
      },

      nextReceiptNumber: () => {
        const n = get().config.receiptCounter
        set((state) => ({
          config: { ...state.config, receiptCounter: state.config.receiptCounter + 1 },
        }))
        return n
      },
    }),
    {
      name: 'company-config',
      version: 1,
      // Merge con DEFAULT_CONFIG: las configs guardadas en versiones anteriores
      // no tienen taxRate y aquí se completa con el valor por defecto (21)
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        config: {
          ...DEFAULT_CONFIG,
          ...((persisted as { config?: Partial<CompanyConfig> } | undefined)?.config ?? {}),
        },
      }),
    },
  ),
)
