import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Settings2 } from 'lucide-react'

export interface ActionItem {
  key: string
  icon: ReactNode
  label: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}

interface ActionsMenuProps {
  items: ActionItem[]
  /** Modo compacto: muestra solo el icono ⚙️ (sin el texto "Acciones"). */
  compact?: boolean
}

const PANEL_WIDTH = 232

/**
 * Menú desplegable "⚙️ Acciones" para móvil.
 * Se renderiza en un portal para no ser recortado por el overflow de la tabla.
 * Cierra con clic fuera, Escape, scroll o resize.
 */
export default function ActionsMenu({ items, compact = false }: ActionsMenuProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const close = () => {
    setOpen(false)
    setPos(null)
  }

  const toggle = () => {
    if (open) return close()
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8))
    setPos({ top: r.bottom + 6, left })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const el = btnRef.current
      const panel = panelRef.current
      const target = e.target as Node
      // No cerrar si el clic es dentro del botón o dentro del panel del menú
      if (el && el.contains(target)) return
      if (panel && panel.contains(target)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onViewportChange = () => close()
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onViewportChange, true)
    window.addEventListener('resize', onViewportChange)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onViewportChange, true)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [open])

  return (
    <div className="relative flex justify-end">
      <button
        ref={btnRef}
        type="button"
        title="Ver acciones"
        aria-label="Ver acciones"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={`glass glass-hover flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl text-xs font-medium text-primary transition-all active:scale-95 ${
          compact ? 'justify-center px-0' : 'px-3'
        }`}
      >
        <Settings2 className="h-4 w-4" />
        {!compact && <span>Acciones</span>}
      </button>

      {open &&
        pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <div
              ref={panelRef}
              role="menu"
              className="glass-strong fixed z-50 overflow-hidden rounded-xl p-1.5 shadow-2xl shadow-black/40"
              style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
            >
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  title={item.label}
                  aria-label={item.label}
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.()
                    close()
                  }}
                  className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors ${
                    item.disabled
                      ? 'cursor-not-allowed text-muted'
                      : item.danger
                        ? 'text-rose-300 hover:bg-rose-500/15'
                        : 'text-primary hover:bg-card'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}
