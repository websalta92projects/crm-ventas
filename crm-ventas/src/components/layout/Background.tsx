// Fondo con "blobs" de gradiente animados (glassmorphism)
// ⚡ Optimización de rendimiento: los blobs animados están DESACTIVADOS.
// Para reactivarlos, descomenta el import y las líneas marcadas abajo.
// import { motion } from 'framer-motion'

export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-950">
      {/* Blob 1 (animación desactivada)
      <motion.div
        className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-600/25 blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, 60, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      */}

      {/* Blob 2 (animación desactivada)
      <motion.div
        className="absolute -right-40 top-1/3 h-[460px] w-[460px] rounded-full bg-sky-500/20 blur-[120px]"
        animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      */}

      {/* Blob 3 (animación desactivada)
      <motion.div
        className="absolute -bottom-40 left-1/3 h-[480px] w-[480px] rounded-full bg-emerald-500/15 blur-[130px]"
        animate={{ x: [0, 30, 0], y: [0, -50, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      */}
    </div>
  )
}
