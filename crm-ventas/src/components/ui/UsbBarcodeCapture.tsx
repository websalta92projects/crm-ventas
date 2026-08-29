// Campo de texto oculto que captura el input de los lectores USB de código de
// barras (emulan teclado). El detector escucha en `window` para funcionar sin
// importar dónde esté el foco dentro del formulario.
import { useUsbBarcodeScanner } from '../../hooks/useUsbBarcodeScanner'

interface UsbBarcodeCaptureProps {
  active: boolean
  onScan: (code: string) => void
}

export default function UsbBarcodeCapture({ active, onScan }: UsbBarcodeCaptureProps) {
  useUsbBarcodeScanner({ active, onScan })
  return (
    <input
      type="text"
      tabIndex={-1}
      aria-hidden="true"
      autoComplete="off"
      readOnly
      value=""
      className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px opacity-0"
    />
  )
}
