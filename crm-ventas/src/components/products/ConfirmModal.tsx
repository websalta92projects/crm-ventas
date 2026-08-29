import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="glass-strong w-[95%] max-h-[90vh] max-w-sm overflow-y-auto p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-secondary">{message}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="glass glass-hover rounded-xl px-4 py-2 text-sm font-medium text-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:brightness-110 active:scale-95"
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
