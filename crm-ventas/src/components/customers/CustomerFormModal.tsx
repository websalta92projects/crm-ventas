import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { UserPlus, X } from 'lucide-react'
import { useSalesStore } from '../../store/salesStore'
import type { Customer } from '../../types'

interface CustomerFormModalProps {
  open: boolean
  customer: Customer | null
  onClose: () => void
  // Se llama tras guardar con el cliente creado/actualizado (para seleccionarlo)
  onSaved?: (customer: Customer) => void
}

export default function CustomerFormModal({
  open,
  customer,
  onClose,
  onSaved,
}: CustomerFormModalProps) {
  const saveCustomer = useSalesStore((s) => s.saveCustomer)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    if (!open) return
    setName(customer?.name ?? '')
    setPhone(customer?.phone ?? '')
    setEmail(customer?.email ?? '')
    setAddress(customer?.address ?? '')
  }, [open, customer])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Escribe el nombre del cliente')
      return
    }
    if (!phone.trim()) {
      toast.error('El teléfono es obligatorio')
      return
    }
    if (!/^[0-9\s-]+$/.test(phone.trim())) {
      toast.error('El teléfono solo puede contener números y guiones')
      return
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('El email no es válido')
      return
    }

    saveCustomer({
      id: customer?.id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
    })
    // Devuelve el cliente guardado para que el flujo de presupuesto lo seleccione
    const saved = customer
      ? {
          ...customer,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
        }
      : useSalesStore.getState().customers.find((c) => c.name === name.trim())
    if (saved) onSaved?.(saved)
    toast.success(customer ? 'Cliente actualizado ✅' : 'Cliente creado 🎉')
    onClose()
  }

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
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="glass-strong my-4 w-[95%] max-h-[90vh] max-w-md overflow-y-auto p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 shadow-lg shadow-violet-500/30">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {customer ? 'Editar cliente' : 'Nuevo cliente'}
                    </h3>
                    <p className="text-xs text-secondary">Se guarda en tu dispositivo</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-secondary hover:bg-card hover:text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Nombre *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Carlos Gómez"
                    className="w-full rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none transition-colors focus:border-violet-400/60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Teléfono *
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 55 1234 5678"
                    className="w-full rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none transition-colors focus:border-violet-400/60"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Solo números y guiones. Se usa para enviar por WhatsApp.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-secondary">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@mail.com"
                    className="w-full rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none transition-colors focus:border-violet-400/60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-secondary">
                    Dirección
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="Calle, número, ciudad…"
                    className="w-full resize-none rounded-xl border border-app bg-card px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none transition-colors focus:border-violet-400/60"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  {customer ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </motion.form>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

