import { useEffect, useState } from 'react'
import Background from './components/layout/Background'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import VirtualAssistant from './components/assistant/VirtualAssistant'
import SaleFormModal from './components/sales/SaleFormModal'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Budgets from './pages/Budgets'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { useSalesStore } from './store/salesStore'
import { formatToday } from './utils/format'
import type { View } from './types'

const HEADERS: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: formatToday() },
  productos: { title: 'Productos', subtitle: 'Catálogo y gestión de inventario' },
  ventas: { title: 'Ventas', subtitle: 'Historial y registro de ventas' },
  presupuestos: { title: 'Presupuestos', subtitle: 'Cotizaciones y seguimiento' },
  clientes: { title: 'Clientes', subtitle: 'Directorio y compras de clientes' },
  reportes: { title: 'Reportes', subtitle: 'Métricas, exportación y respaldo' },
  configuracion: { title: 'Configuración', subtitle: 'Empresa, logo y folios' },
}

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [saleModalOpen, setSaleModalOpen] = useState(false)
  const [saleFromBudgetId, setSaleFromBudgetId] = useState<string | null>(null)
  // Búsqueda inicial para la página de Clientes (desde el Dashboard: clientes frecuentes)
  const [customerSearch, setCustomerSearch] = useState('')

  // "Force refresh": sube con cada cambio de datos del store. Se pasa a las
  // páginas con listas para garantizar que siempre se re-rendericen tras guardar,
  // eliminar o cambiar el estado de un registro (sin necesidad de F5).
  const refreshKey = useSalesStore((s) => s.dataVersion)

  // En móvil, el teclado virtual no debe tapar los inputs: al enfocar se hace
  // scrollIntoView para mantener el campo visible.
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
      }
    }
    document.addEventListener('focusin', onFocus, true)
    return () => document.removeEventListener('focusin', onFocus, true)
  }, [])

  const header = HEADERS[view]

  const navigate = (v: View) => {
    setView(v)
    setSidebarOpen(false)
  }

  // Flujo presupuesto → venta: el presupuesto se marca Aceptado al crear la venta
  const createSaleFromBudget = (budgetId: string) => {
    setSaleFromBudgetId(budgetId)
    navigate('ventas')
  }

  return (
    <div className="relative flex h-screen overflow-hidden text-primary">
      <Background />
      <Sidebar
        open={sidebarOpen}
        activeView={view}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigate}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Header
          title={header.title}
          subtitle={header.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          onNewSale={() => setSaleModalOpen(true)}
          showNewSale={view === 'dashboard'}
        />
        <main id="main-content" className="flex-1 overflow-y-auto px-4 pb-10 md:px-8">
          {view === 'dashboard' && (
            <Dashboard
              onNavigate={navigate}
              onSearchCustomer={(name) => {
                setCustomerSearch(name)
                navigate('clientes')
              }}
            />
          )}
          {view === 'productos' && <Products refreshKey={refreshKey} />}
          {view === 'ventas' && (
            <Sales
              initialBudgetId={saleFromBudgetId}
              onBudgetConsumed={() => setSaleFromBudgetId(null)}
              refreshKey={refreshKey}
            />
          )}
          {view === 'presupuestos' && <Budgets onCreateSale={createSaleFromBudget} refreshKey={refreshKey} />}
          {view === 'clientes' && <Customers refreshKey={refreshKey} initialQuery={customerSearch} />}
          {view === 'reportes' && <Reports />}
          {view === 'configuracion' && <Settings />}
        </main>
      </div>

      <VirtualAssistant />
      <SaleFormModal open={saleModalOpen} onClose={() => setSaleModalOpen(false)} />
    </div>
  )
}
