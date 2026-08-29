import { useEffect, useRef } from 'react'

interface UsbBarcodeScannerOptions {
  active: boolean
  onScan: (code: string) => void
}

// Detecta lectores USB de códigos de barras que emulan teclado.
// Un lector USB escribe el código en una ráfaga muy rápida (< 60 ms por tecla)
// y termina con Enter o Tab. El tipeo humano normal es mucho más lento, así que
// una pausa mayor reinicia el buffer y evita falsos positivos.
export function useUsbBarcodeScanner({ active, onScan }: UsbBarcodeScannerOptions) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!active) return

    const handleKey = (e: KeyboardEvent) => {
      const now = Date.now()
      const elapsed = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // Enter o Tab finalizan la secuencia del lector USB
      if (e.key === 'Enter' || e.key === 'Tab') {
        const code = bufferRef.current.trim()
        bufferRef.current = ''
        if (code.length >= 3) {
          // Evita que el Enter dispare el submit del formulario
          e.preventDefault()
          e.stopPropagation()
          onScanRef.current(code)
        }
        return
      }

      // Solo caracteres imprimibles y sin atajos de teclado
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return

      // Pausa > 60 ms → tipeo normal → se reinicia la secuencia
      if (elapsed > 60) bufferRef.current = ''
      bufferRef.current += e.key
      if (bufferRef.current.length > 64) bufferRef.current = ''
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active])
}
