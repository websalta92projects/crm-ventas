import { Bell, Menu, Plus, Search } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle: string
  onMenuClick: () => void
  onNewSale: () => void
  showNewSale?: boolean
}

export default function Header({
  title,
  subtitle,
  onMenuClick,
  onNewSale,
  showNewSale = true,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-4 px-4 py-4 md:px-8">
      <button
        onClick={onMenuClick}
        title="Abrir menú"
        aria-label="Abrir menú"
        className="glass glass-hover flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center lg:hidden"
      >
        <Menu className="h-5 w-5 text-secondary" />
      </button>

      <div className="hidden md:block">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-xs capitalize text-secondary">{subtitle}</p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="glass hidden items-center gap-2 rounded-xl px-3 py-2 md:flex">
          <Search className="h-4 w-4 text-muted" />
          <input
            placeholder="Buscar venta, producto, cliente…"
            className="w-48 bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none lg:w-64"
          />
        </div>

        <button
          title="Notificaciones"
          aria-label="Notificaciones"
          className="glass glass-hover flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <Bell className="h-4 w-4 text-secondary" />
        </button>

        {showNewSale && (
          <button
            onClick={onNewSale}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-violet-500/40 hover:brightness-110 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva venta</span>
          </button>
        )}
      </div>
    </header>
  )
}
