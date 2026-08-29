// Comparte un PDF junto con el mensaje de WhatsApp usando la Web Share API (móvil).
// Devuelve true si se compartió; false si no fue posible (el llamador abre wa.me como respaldo).
export async function trySharePdf(text: string, blob: Blob, filename: string): Promise<boolean> {
  try {
    const file = new File([blob], filename, { type: 'application/pdf' })
    const nav = navigator as Navigator & {
      canShare?: (data?: { files?: File[] }) => boolean
      share?: (data?: { files?: File[]; text?: string; title?: string }) => Promise<void>
    }
    if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], text, title: filename })
      return true
    }
  } catch {
    // El usuario canceló o el entorno no soporta compartir archivos
  }
  return false
}
