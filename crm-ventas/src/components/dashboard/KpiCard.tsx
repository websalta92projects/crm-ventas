import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  gradient: string
  delay?: number
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  delay = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className="glass glass-hover p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-white" title={value}>
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">{subtitle}</p>
    </motion.div>
  )
}
