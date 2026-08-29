import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, ChevronRight, Sparkles, X } from 'lucide-react'
import { motivationalMessages } from '../../data/motivationalMessages'

const ROTATION_MS = 12_000

export default function VirtualAssistant() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * motivationalMessages.length),
  )

  // Cambia la frase automáticamente cada 12 segundos
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % motivationalMessages.length)
    }, ROTATION_MS)
    return () => clearInterval(id)
  }, [])

  const next = () => setIndex((prev) => (prev + 1) % motivationalMessages.length)

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="glass-strong fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden md:right-6"
          >
            <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-violet-500/15 to-sky-500/15 px-5 py-4">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 shadow-lg shadow-violet-500/30">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Asistente Virtual</p>
                <p className="text-[11px] text-slate-400">En línea · Motivación diaria</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-relaxed text-slate-200"
                >
                  {motivationalMessages[index]}
                </motion.div>
              </AnimatePresence>

              <button
                onClick={next}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                Nueva frase motivadora
              </button>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                Cambia automáticamente cada {ROTATION_MS / 1000} segundos
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-white shadow-xl shadow-violet-500/40 md:right-6"
        title="Asistente motivacional"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'open'}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex"
          >
            {open ? <ChevronRight className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  )
}
