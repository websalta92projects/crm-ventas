import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Barcode, Lightbulb, X } from 'lucide-react'

interface BarcodeScannerModalProps {
  open: boolean
  onClose: () => void
  onScan: (code: string) => void
}

type ScannerHandle = {
  stop: () => Promise<void>
  clear: () => void
  applyVideoConstraints?: (c: MediaTrackConstraints) => Promise<void>
}

// Escáner de códigos de barras con la cámara del dispositivo (html5-qrcode)
export default function BarcodeScannerModal({ open, onClose, onScan }: BarcodeScannerModalProps) {
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [torch, setTorch] = useState(false)
  const scannerRef = useRef<ScannerHandle | null>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!open) return
    setError('')
    setReady(false)
    setTorch(false)
    let cancelled = false
    let scanner: ScannerHandle | null = null

    const stopAndClear = () => {
      if (scanner) {
        scanner.stop().catch(() => {})
        scanner.clear()
      }
      scannerRef.current = null
    }

    const start = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (cancelled) return
        const sc = new Html5Qrcode('barcode-scanner-region', {
          verbose: false,
          useBarCodeDetectorIfSupported: true,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        })
        scanner = sc
        scannerRef.current = sc
        await sc.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 160 } },
          (decodedText: string) => {
            stopAndClear()
            onScanRef.current(decodedText.trim())
          },
          () => {},
        )
        if (!cancelled) setReady(true)
      } catch {
        if (!cancelled) {
          setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
        }
      }
    }

    start()
    return () => {
      cancelled = true
      stopAndClear()
    }
  }, [open])

  const toggleTorch = async () => {
    const scanner = scannerRef.current
    if (!scanner?.applyVideoConstraints) return
    try {
      await scanner.applyVideoConstraints({
        advanced: [{ torch: !torch }],
      } as unknown as MediaTrackConstraints)
      setTorch(!torch)
    } catch {
      toast.error('Tu dispositivo no soporta la linterna')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="glass-strong my-4 w-[95%] max-w-md overflow-hidden rounded-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Barcode className="h-5 w-5 text-sky-300" />
                  <h3 className="text-sm font-bold text-white">Escanear código de barras</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTorch}
                    title="Linterna"
                    aria-label="Linterna"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-secondary transition-colors hover:bg-card hover:text-primary"
                  >
                    <Lightbulb
                      className={`h-5 w-5 ${torch ? 'fill-amber-300 text-amber-300' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    title="Cerrar"
                    aria-label="Cerrar"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-secondary transition-colors hover:bg-card hover:text-primary"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div
                  id="barcode-scanner-region"
                  className="mx-auto max-w-sm overflow-hidden rounded-xl bg-slate-950/80"
                />
                {error ? (
                  <p className="mt-2 text-center text-xs text-rose-400">{error}</p>
                ) : !ready ? (
                  <p className="mt-2 text-center text-xs text-secondary">Activando cámara…</p>
                ) : (
                  <p className="mt-2 text-center text-xs text-secondary">
                    Apunta la cámara al código de barras del producto
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
