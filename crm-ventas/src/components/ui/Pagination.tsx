import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

/**
 * Paginación reutilizable con estilo glassmorphism.
 * En móvil (< sm) muestra solo las flechas; el texto aparece en pantallas medianas+.
 */
export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        title="Página anterior"
        aria-label="Página anterior"
        className="glass glass-hover flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-medium text-primary transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Anterior</span>
      </button>

      <span className="text-sm tabular-nums text-secondary">
        Página {page} de {totalPages}
      </span>

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        title="Página siguiente"
        aria-label="Página siguiente"
        className="glass glass-hover flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-medium text-primary transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
