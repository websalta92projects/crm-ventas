import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react'
import { useConfigStore } from '../../store/configStore'
import type { View } from '../../types'

interface SidebarProps {
  open: boolean
  activeView: View
  onClose: () => void
  onNavigate: (view: View) => void
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, soon: false },
  { id: 'productos', label: 'Productos', icon: Package, soon: false },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart, soon: false },
  { id: 'presupuestos', label: 'Presupuestos', icon: ClipboardList, soon: false },
  { id: 'clientes', label: 'Clientes', icon: Users, soon: false },
  { id: 'reportes', label: 'Reportes', icon: BarChart3, soon: false },
  { id: 'configuracion', label: 'Configuración', icon: Settings, soon: false },
]

function SidebarContent({
  activeView,
  onNavigate,
}: {
  activeView: View
  onNavigate: (view: View) => void
}) {
  // Nombre, subtítulo y logo personalizables desde Configuración (company-config)
  const config = useConfigStore((s) => s.config)

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-8 flex items-center gap-3">
        {config.logo ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-app bg-card">
            <img src={config.logo} alt={config.name} className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 text-sm font-bold text-white shadow-lg shadow-violet-500/30">
            {(config.name.trim()[0] || 'E').toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight text-white">
            {config.name || 'ElectroCRM'}
          </h1>
          {config.subtitle?.trim() && (
            <p className="truncate text-[11px] text-secondary">{config.subtitle}</p>
          )}
        </div>
        <button
          onClick={() => onNavigate(activeView)}
          className="rounded-lg p-1 text-secondary hover:text-primary lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = item.id === activeView
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!item.soon) onNavigate(item.id as View)
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                item.soon
                  ? 'cursor-not-allowed text-muted'
                  : active
                    ? 'bg-gradient-to-r from-violet-500/20 to-sky-500/10 text-white shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)]'
                    : 'text-secondary hover:bg-card hover:text-primary'
              }`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.soon && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-secondary">
                  Pronto
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default function Sidebar({ open, activeView, onClose, onNavigate }: SidebarProps) {
  return (
    <>
      {/* Overlay para móvil */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Drawer móvil */}
      <AnimatePresence>
        {open && (
          <motion.aside
            className="fixed inset-y-0 left-0 z-40 w-72 p-5 lg:hidden"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="glass-strong flex h-full w-full p-5">
              <SidebarContent activeView={activeView} onNavigate={onNavigate} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar de escritorio */}
      <aside className="hidden w-72 shrink-0 p-5 lg:block">
        <div className="glass-strong flex h-full w-full p-5">
          <SidebarContent activeView={activeView} onNavigate={onNavigate} />
        </div>
      </aside>
    </>
  )
}
