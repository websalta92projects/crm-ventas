import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Barcode, Keyboard, Lightbulb, X } from 'lucide-react'

interface BarcodeScannerModalProps {
  open: boolean
  onClose: () => void
  onScan: (code: string) => void
  // Abre el modal directamente con el campo de ingreso manual visible
  startWithManual?: boolean
}

// Motor activo: 'starting' | 'detector' (BarcodeDetector API) | 'zxing' (@zxing) | 'failed'
type Engine = 'starting' | 'detector' | 'zxing' | 'failed'

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorInstance

const DETECTOR_FORMATS = ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']

const PERMISSION_MSG =
  '⚠️ Permiso de cámara denegado. Actívalo en Configuración → Safari → Cámara → Permitir.'
const NO_DETECT_MSG = '⚠️ No se detectó ningún código. Ingresa el código manualmente.'
const GENERIC_MSG =
  'No se pudo acceder a la cámara. Revisa los permisos o ingresa el código manualmente.'

// Escáner de códigos de barras con TRES capas (compatible iPhone/iOS):
//   Capa 1: BarcodeDetector API (nativa) — rápida y confiable.
//   Capa 2: @zxing/library (BrowserMultiFormatReader) si BarcodeDetector no está disponible.
//   Capa 3: ingreso manual del código (siempre disponible).
export default function BarcodeScannerModal({
  open,
  onClose,
  onScan,
  startWithManual = false,
}: BarcodeScannerModalProps) {
  const [error, setError] = useState('')
  const [engine, setEngine] = useState<Engine>('starting')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [torch, setTorch] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null)
  const zxingRef = useRef<{ reset: () => void } | null>(null)
  const rafRef = useRef<number | null>(null)
  const engineRef = useRef<Engine>('starting')
  const permissionDeniedRef = useRef(false)
  const noDetectTimerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const setEngineState = (e: Engine) => {
    engineRef.current = e
    setEngine(e)
  }

  const getBarcodeDetectorCtor = (): BarcodeDetectorCtor | null => {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null
    return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null
  }

  // Determina si el error de cámara se debe a permisos denegados (iOS/Safari)
  const isPermissionError = (err: unknown): boolean => {
    const name = (err as { name?: string })?.name ?? ''
    const msg = String((err as { message?: string })?.message ?? '')
    return (
      name === 'NotAllowedError' ||
      name === 'PermissionDeniedError' ||
      name === 'SecurityError' ||
      /permission|denied|denegado|not allowed/i.test(msg)
    )
  }

  const clearNoDetectTimer = () => {
    if (noDetectTimerRef.current) {
      window.clearTimeout(noDetectTimerRef.current)
      noDetectTimerRef.current = null
    }
  }

  // Detiene el stream, el video, BarcodeDetector y ZXing (se llama al cerrar el modal)
  const stopScanner = () => {
    clearNoDetectTimer()
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    detectorRef.current = null
    if (zxingRef.current) {
      try {
        zxingRef.current.reset()
      } catch {
        // ya detenido
      }
      zxingRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    if (!open) return
    setError('')
    setEngineState('starting')
    permissionDeniedRef.current = false
    cancelledRef.current = false
    setManualOpen(startWithManual)
    setManualCode('')
    setTorch(false)

    // Si la cámara está activa y no detecta nada en 15s, se detiene y se ofrece el manual
    const armNoDetectTimeout = () => {
      clearNoDetectTimer()
      noDetectTimerRef.current = window.setTimeout(() => {
        if (!cancelledRef.current) {
          console.log('📷 Sin detección en 15s → deteniendo escáner')
          toast.error(NO_DETECT_MSG)
          stopScanner()
          setEngineState('failed')
        }
      }, 15000)
    }

    // ---------- Capa 1: BarcodeDetector API (nativa) ----------
    const startWithBarcodeDetector = async (): Promise<boolean> => {
      const video = videoRef.current
      if (!video) return false
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      video.srcObject = stream
      await video.play()
      const Ctor = getBarcodeDetectorCtor()
      if (!Ctor) return false
      const detector = new Ctor({ formats: DETECTOR_FORMATS })
      detectorRef.current = detector
      const loop = async () => {
        if (cancelledRef.current) return
        try {
          const codes = await detector.detect(video)
          if (codes.length > 0) {
            console.log('📷 Código detectado:', codes[0].rawValue)
            stopScanner()
            onScanRef.current(codes[0].rawValue.trim())
            return
          }
        } catch (err) {
          console.log('📷 BarcodeDetector error:', err)
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      loop()
      setEngineState('detector')
      return true
    }

    // ---------- Capa 2: ZXing (fallback) ----------
    const startWithZxing = async (): Promise<boolean> => {
      const video = videoRef.current
      if (!video) return false
      // Si quedó un stream de la capa 1, se detiene (ZXing adquiere el suyo)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      const { BrowserMultiFormatReader } = await import('@zxing/library')
      const reader = new BrowserMultiFormatReader()
      zxingRef.current = reader
      await reader.decodeFromVideoDevice(null, video, (result) => {
        if (result && !cancelledRef.current) {
          console.log('📷 Código detectado:', result.getText())
          stopScanner()
          onScanRef.current(result.getText().trim())
        }
      })
      setEngineState('zxing')
      return true
    }

    const start = async () => {
      // Capa 1: BarcodeDetector (Chrome/Android/Firefox; en iPhone cae a ZXing)
      if (getBarcodeDetectorCtor()) {
        console.log('📷 Intentando BarcodeDetector...')
        try {
          const ok = await startWithBarcodeDetector()
          if (cancelledRef.current) return
          if (ok) {
            console.log('📷 BarcodeDetector activo')
            armNoDetectTimeout()
            return
          }
        } catch (err) {
          console.log('📷 Error al iniciar BarcodeDetector:', err)
          if (isPermissionError(err)) permissionDeniedRef.current = true
        }
      } else {
        console.log('📷 BarcodeDetector NO disponible → usando ZXing')
      }

      // Capa 2: ZXing
      try {
        console.log('📷 Intentando ZXing...')
        const ok = await startWithZxing()
        if (cancelledRef.current) return
        if (ok) {
          console.log('📷 ZXing activo')
          armNoDetectTimeout()
          return
        }
      } catch (err) {
        console.log('📷 Error al iniciar ZXing:', err)
        if (isPermissionError(err)) permissionDeniedRef.current = true
      }

      // Capa 3: solo ingreso manual
      setEngineState('failed')
      setError(permissionDeniedRef.current ? PERMISSION_MSG : GENERIC_MSG)
    }

    start()

    // Cleanup: detiene la cámara al cerrar el modal / desmontar el componente
    return () => {
      cancelledRef.current = true
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null
    const track = stream?.getVideoTracks()[0]
    if (!track || typeof track.applyConstraints !== 'function') return
    try {
      await track.applyConstraints({
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
    console.log('📷 Código manual:', code)
    stopScanner()
    onScanRef.current(code)
  }

  const cameraActive = engine === 'detector' || engine === 'zxing'

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
                  {cameraActive && (
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
                {/* Video de la cámara en tiempo real (getUserMedia) */}
                <div className="mx-auto max-w-sm overflow-hidden rounded-xl bg-slate-950/80">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    style={{ width: '100%', height: 'auto', maxHeight: '400px' }}
                    className="block"
                  />
                </div>
                {error ? (
                  <p className="mt-2 text-center text-xs text-rose-400">{error}</p>
                ) : engine === 'detector' ? (
                  <p className="mt-2 text-center text-xs text-secondary">
                    Apunta la cámara al código de barras del producto
                  </p>
                ) : engine === 'zxing' ? (
                  <p className="mt-2 text-center text-xs text-secondary">
                    Apunta la cámara al código (modo compatibilidad)
                  </p>
                ) : engine === 'failed' ? (
                  <p className="mt-2 text-center text-xs text-secondary">
                    Ingresa el código manualmente abajo
                  </p>
                ) : (
                  <p className="mt-2 text-center text-xs text-secondary">Activando cámara…</p>
                )}

                {/* Capa 3: ingreso manual (SIEMPRE disponible) */}
                <div className="mt-3">
                  {!manualOpen ? (
                    <button
                      type="button"
                      onClick={() => setManualOpen(true)}
                      className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-app bg-card px-3 text-sm font-semibold text-primary transition-all hover:bg-card active:scale-95"
                    >
                      <Keyboard className="h-4 w-4" />
                      ⌨️ Ingresar código manual
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
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}