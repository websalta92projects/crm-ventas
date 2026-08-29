import type { ReactNode } from 'react'

interface ActionButtonProps {
  icon: ReactNode
  label: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}

/**
 * Botón de acción con estilo glassmorphism: ícono + texto.
 * Incluye title (tooltip en hover) y aria-label (accesibilidad),
 * y una altura mínima de 44px para una buena área táctil.
 */
export default function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`glass glass-hover flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
        disabled
          ? 'text-muted'
          : danger
            ? 'text-rose-300 hover:border-rose-400/30 hover:text-rose-200'
            : 'text-primary hover:text-primary'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
