import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Barcode, Keyboard, Lightbulb, X } from 'lucide-react'

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

// Motor activo: 'starting' (arrancando), 'html5' (html5-qrcode), 'zxing' (@zxing), 'failed'
type Engine = 'starting' | 'html5' | 'zxing' | 'failed'

// Escáner de códigos de barras compatible con iPhone/iOS (Safari):
//  - Motor principal: html5-qrcode (usa el decoder ZXing internamente y setea playsInline).
//  - Respaldo iOS: @zxing/library (BrowserMultiFormatReader) con <video playsInline>.
//  - Fallback final: entrada manual del código si la cámara no inicia en 5 segundos.
export default function BarcodeScannerModal({ open, onClose, onScan }: BarcodeScannerModalProps) {
  const [error, setError] = useState('')
  const [engine, setEngine] = useState<Engine>('starting')
  const [zxingActive, setZxingActive] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [torch, setTorch] = useState(false)

  const scannerRef = useRef<ScannerHandle | null>(null)
  const zxingRef = useRef<{ reset: () => void } | null>(null)
  const engineRef = useRef<Engine>('starting')
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const setEngineState = (e: Engine) => {
    engineRef.current = e
    setEngine(e)
  }

  // Detiene ambos motores (html5-qrcode y @zxing)
  const stopAll = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current.clear()
    }
    scannerRef.current = null
    if (zxingRef.current) {
      try {
        zxingRef.current.reset()
      } catch {
        // ya detenido
      }
    }
    zxingRef.current = null
    setZxingActive(false)
  }

  useEffect(() => {
    if (!open) return
    setError('')
    setEngineState('starting')
    setShowManual(false)
    setManualOpen(false)
    setManualCode('')
    setTorch(false)
    setZxingActive(false)
    let cancelled = false

    const startHtml5 = async (): Promise<boolean> => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (cancelled) return false
        const sc = new Html5Qrcode('barcode-scanner-region', {
          verbose: false,
          useBarCodeDetectorIfSupported: true,
          // Formatos estándar de productos: QR + EAN-13 + UPC-A (compatibles con iOS)
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
        })
        scannerRef.current = sc
        await sc.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 160 } },
          (decodedText: string) => {
            // Depuración: verificar que el escaneo se ejecuta en el dispositivo
            console.log('[electro-crm] Código de barras escaneado (html5-qrcode):', decodedText)
            stopAll()
            onScanRef.current(decodedText.trim())
          },
          () => {},
        )
        if (!cancelled) {
          setEngineState('html5')
          return true
        }
        return false
      } catch (err) {
        if (!cancelled) {
          console.warn('[electro-crm] html5-qrcode no inició, probando @zxing:', err)
        }
        return false
      }
    }

    const startZxing = async (): Promise<boolean> => {
      try {
        const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import(
          '@zxing/library',
        )
        if (cancelled) return false
        const video = document.getElementById('barcode-scanner-video') as HTMLVideoElement | null
        if (!video) return false
        // El video debe estar visible y con dimensiones para que @zxing pueda decodificar
        video.classList.remove('hidden')
        setZxingActive(true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.EAN_13,
          BarcodeFormat.UPC_A,
        ])
        const reader = new BrowserMultiFormatReader(hints, 250)
        zxingRef.current = reader
        await reader.decodeFromVideoDevice(null, video, (result) => {
          if (result && !cancelled) {
            const text = result.getText()
            console.log('[electro-crm] Código de barras escaneado (@zxing):', text)
            stopAll()
            onScanRef.current(text.trim())
          }
        })
        if (!cancelled) {
          setEngineState('zxing')
          return true
        }
        return false
      } catch (err) {
        if (!cancelled) {
          console.warn('[electro-crm] @zxing no pudo iniciar la cámara:', err)
        }
        return false
      }
    }

    const start = async () => {
      const html5Ok = await startHtml5()
      if (cancelled) return
      if (!html5Ok) {
        const zxingOk = await startZxing()
        if (cancelled) return
        if (!zxingOk) {
          setError('No se pudo acceder a la cámara. Revisa los permisos o ingresa el código manualmente.')
          setEngineState('failed')
        }
      }
    }

    start()

    // Fallback manual: si en 5 segundos la cámara no está lista, se ofrece
    // ingresar el código a mano (útil en iOS/Safari con permisos bloqueados).
    const timeout = window.setTimeout(() => {
      if (!cancelled && engineRef.current !== 'html5' && engineRef.current !== 'zxing') {
        setShowManual(true)
      }
    }, 5000)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      stopAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const code = manualCode.trim()
    if (!code) {
      toast.error('Escribe el código de barras')
      return
    }
    console.log('[electro-crm] Código de barras manual:', code)
    stopAll()
    onScanRef.current(code)
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
                  <h3 className="text-sm font-bold text-primary">Escanear código de barras</h3>
                </div>
                <div className="flex items-center gap-2">
                  {engine === 'html5' && (
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
                  )}
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
                <div className="relative mx-auto max-w-sm overflow-hidden rounded-xl bg-slate-950/80">
                  {/* Motor html5-qrcode: inyecta su propio <video> aquí */}
                  <div id="barcode-scanner-region" className={zxingActive ? 'hidden' : ''} />
                  {/* Motor @zxing: <video playsInline> propio (requerido por iOS/Safari) */}
                  <video
                    id="barcode-scanner-video"
                    playsInline
                    muted
                    className={`${
                      zxingActive ? 'block h-64 w-full object-cover' : 'hidden'
                    }`}
                  />
                </div>
                {error ? (
                  <p className="mt-2 text-center text-xs text-rose-400">{error}</p>
                ) : engine === 'html5' ? (
                  <p className="mt-2 text-center text-xs text-secondary">
                    Apunta la cámara al código de barras del producto
                  </p>
                ) : engine === 'zxing' ? (
                  <p className="mt-2 text-center text-xs text-secondary">
                    Apunta la cámara al código (modo compatibilidad iOS)
                  </p>
                ) : engine === 'failed' ? (
                  <p className="mt-2 text-center text-xs text-secondary">
                    Ingresa el código manualmente abajo
                  </p>
                ) : (
                  <p className="mt-2 text-center text-xs text-secondary">Activando cámara…</p>
                )}

                {showManual && (
                  <div className="mt-3">
                    {!manualOpen ? (
                      <button
                        type="button"
                        onClick={() => setManualOpen(true)}
                        className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-app bg-card px-3 text-sm font-semibold text-primary transition-all hover:bg-card active:scale-95"
                      >
                        <Keyboard className="h-4 w-4" />
                        📷 Ingresar código manual
                      </button>
                    ) : (
                      <form onSubmit={submitManual} className="flex gap-2">
                        <input
                          autoFocus
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="Ej. 7501234567890"
                          inputMode="numeric"
                          autoComplete="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          className="min-h-[44px] w-full rounded-xl border border-app bg-card px-3 text-sm text-primary placeholder:text-muted outline-none transition-colors focus:border-violet-400/60"
                        />
                        <button
                          type="submit"
                          className="flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 active:scale-95"
                        >
                          Añadir
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}