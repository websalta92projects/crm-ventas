import type { Budget, CompanyConfig, Customer, Sale } from '../types'
import { formatMoney, formatDateOnly } from './format'
import { TAX_RATE } from './budget'

// ===== PDF profesional para presupuestos y recibos (jsPDF + autotable) =====

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ===== Limpieza de texto para el PDF =====
// Las fuentes estándar de jsPDF (helvetica/courier) usan WinAnsi/Latin-1, por lo
// que emojis y caracteres no ASCII se dibujan como glifos extraños. Esta función
// normaliza (NFKD), quita diacríticos y conserva solo letras, números, espacios y puntos.
export function sanitizePdfText(text: string): string {
  if (!text) return ''
  return despaceLetters(
    text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 .]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

// Une letras individuales separadas por espacios del mismo caso y en secuencias
// largas ("k i n g c r e s t" → "kingcrest") para recuperar nombres corruptos con
// espaciado entre letras. Evita fusionar letras sueltas de prefijos residuales.
function despaceLetters(text: string): string {
  const words = text.split(' ')
  const out: string[] = []
  let run: string[] = []
  const flush = () => {
    const allSameCase =
      run.every((c) => c === c.toLowerCase()) || run.every((c) => c === c.toUpperCase())
    if (run.length >= 4 && allSameCase) out.push(run.join(''))
    else out.push(...run)
    run = []
  }
  for (const w of words) {
    if (/^[A-Za-z]$/.test(w)) run.push(w)
    else {
      flush()
      out.push(w)
    }
  }
  flush()
  return out.join(' ')
}

export interface DocLine {
  name: string
  quantity: number
  unitPrice: number
}

export interface DocData {
  type: 'PRESUPUESTO' | 'RECIBO'
  number: number
  customerName: string
  customerPhone: string
  date: string
  lines: DocLine[]
  subtotal: number
  tax: number
  total: number
  config: CompanyConfig
}

// Construye el documento PDF (jsPDF) listo para guardar o compartir
export async function buildDocumentDoc(data: DocData): Promise<import('jspdf').jsPDF> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()
  const color = hexToRgb(data.config.color) ?? ([139, 92, 246] as [number, number, number])
  const gray = [100, 116, 139] as [number, number, number]
  const dark = [17, 24, 39] as [number, number, number]
  const border = [229, 231, 235] as [number, number, number] // #E5E7EB
  const altRow = [243, 244, 246] as [number, number, number] // #F3F4F6
  const totalBg = [209, 250, 229] as [number, number, number] // #D1FAE5
  const totalText = [6, 95, 70] as [number, number, number] // #065F46

  const PAGE_W = 210
  const PAGE_H = 297
  const M = 20 // margen de 20mm en todos los lados
  const right = PAGE_W - M
  const center = PAGE_W / 2

  // ----- Encabezado: logo (si existe) + nombre/datos de la empresa -----
  let nameX = M
  if (data.config.logo) {
    try {
      const props = doc.getImageProperties(data.config.logo)
      if (props && props.width > 0 && props.height > 0) {
        const MAX_W = 40
        const MAX_H = 22
        let w = MAX_W
        let h = (w * props.height) / props.width
        if (h > MAX_H) {
          h = MAX_H
          w = (h * props.width) / props.height
        }
        doc.addImage(data.config.logo, 'PNG', M, M, w, h)
        nameX = M + w + 8
      }
    } catch {
      // Logo no legible: se muestra solo el nombre de la empresa
    }
  }

  // Nombre y subtítulo de la empresa (si no hay logo se muestra solo el nombre)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...dark)
  doc.text(data.config.name, nameX, M + 7)
  if (data.config.subtitle?.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...gray)
    doc.text(data.config.subtitle.trim(), nameX, M + 13)
  }

  // Contacto (dirección, teléfono, email) alineado a la derecha
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  let cy = M + 3
  if (data.config.address?.trim()) {
    doc.text(data.config.address.trim(), right, cy, { align: 'right' })
    cy += 4.5
  }
  if (data.config.phone?.trim()) {
    doc.text(`Tel: ${data.config.phone.trim()}`, right, cy, { align: 'right' })
    cy += 4.5
  }
  if (data.config.email?.trim()) {
    doc.text(`Email: ${data.config.email.trim()}`, right, cy, { align: 'right' })
  }

  // Línea de acento con el color principal bajo el encabezado
  doc.setDrawColor(...color)
  doc.setLineWidth(1)
  doc.line(M, M + 24, right, M + 24)

  // ----- Título del documento -----
  doc.setTextColor(...color)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(`${data.type} #${data.number}`, M, M + 36)

  // ----- Cliente y fecha -----
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...dark)
  doc.text(`Fecha: ${data.date}`, M, M + 44)
  doc.text(`Cliente: ${sanitizePdfText(data.customerName) || 'Cliente'}`, M, M + 49)
  doc.text(`Teléfono: ${data.customerPhone || '—'}`, M, M + 54)

  // ----- Tabla de productos (bordes suaves, encabezado con color, filas alternadas) -----
  autoTable(doc, {
    startY: M + 61,
    margin: { left: M, right: M, top: M, bottom: 30 },
    head: [['#', 'Cant.', 'Descripción', 'Precio unitario', 'Subtotal']],
    body: data.lines.map((l, idx) => [
      String(idx + 1),
      String(l.quantity),
      sanitizePdfText(l.name) || 'Producto',
      formatMoney(l.unitPrice),
      formatMoney(l.unitPrice * l.quantity),
    ]),
    theme: 'grid',
    styles: {
      fontSize: 9,
      textColor: dark,
      lineColor: border,
      lineWidth: 0.2,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: color,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: altRow,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 34 },
    },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // ----- Totales (sección separada con Total destacado) -----
  const boxX = 108
  const boxW = right - boxX
  const totalsTop = finalY + 6
  const totalsBottom = totalsTop + 27

  // Marco del bloque de totales
  doc.setDrawColor(...border)
  doc.setLineWidth(0.3)
  doc.roundedRect(boxX, totalsTop, boxW, totalsBottom - totalsTop, 3, 3, 'S')

  let ty = totalsTop + 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...dark)
  doc.text('Subtotal:', boxX + 4, ty)
  doc.text(formatMoney(data.subtotal), right - 4, ty, { align: 'right' })
  ty += 6
  doc.text(`IVA (${Math.round(TAX_RATE * 100)}%):`, boxX + 4, ty)
  doc.text(formatMoney(data.tax), right - 4, ty, { align: 'right' })

  // Fila del Total: fondo verde claro y texto verde oscuro
  const totalTop = totalsTop + 16
  const totalRowH = 10
  doc.setFillColor(...totalBg)
  doc.roundedRect(boxX, totalTop, boxW, totalRowH, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...totalText)
  doc.text('TOTAL:', boxX + 4, totalTop + 7)
  doc.text(formatMoney(data.total), right - 4, totalTop + 7, { align: 'right' })

  // ----- Pie de página (mensaje, fecha de generación y número de página) -----
  const pages = doc.getNumberOfPages()
  const today = formatDateOnly(new Date().toISOString())
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...border)
    doc.setLineWidth(0.2)
    doc.line(M, PAGE_H - 18, right, PAGE_H - 18)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...gray)
    doc.text(data.config.footer?.trim() || '¡Gracias por su preferencia!', center, PAGE_H - 14, {
      align: 'center',
    })
    doc.text(`Generado el ${today}`, center, PAGE_H - 9, { align: 'center' })
    doc.text(`Página ${i} de ${pages}`, right, PAGE_H - 9, { align: 'right' })
  }

  return doc
}

// Genera y descarga el PDF
export async function generateDocumentPDF(data: DocData): Promise<void> {
  const doc = await buildDocumentDoc(data)
  doc.save(`${data.type.toLowerCase()}-${data.number}.pdf`)
}

// Genera el PDF como Blob (para compartirlo por WhatsApp/Web Share API)
export async function getDocumentPDFBlob(data: DocData): Promise<Blob> {
  const doc = await buildDocumentDoc(data)
  return doc.output('blob')
}

export async function generateBudgetPDF(
  budget: Budget,
  customer: Customer | undefined,
  config: CompanyConfig,
): Promise<void> {
  await generateDocumentPDF({
    type: 'PRESUPUESTO',
    number: budget.number,
    customerName: customer?.name ?? 'Sin cliente',
    customerPhone: customer?.phone ?? '',
    date: formatDateOnly(budget.createdAt),
    lines: budget.items.map((i) => ({
      name: `${i.emoji || ''} ${i.name}`.trim(),
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
    subtotal: budget.subtotal,
    tax: budget.tax,
    total: budget.total,
    config,
  })
}

export async function generateReceiptPDF(
  sale: Sale,
  customer: Customer | undefined,
  config: CompanyConfig,
  number: number,
): Promise<void> {
  const subtotal = sale.items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0)
  const tax = subtotal * TAX_RATE
  await generateDocumentPDF({
    type: 'RECIBO',
    number,
    customerName: customer?.name ?? 'Sin cliente',
    customerPhone: customer?.phone ?? '',
    date: formatDateOnly(sale.date),
    lines: sale.items.map((i) => ({
      name: `${i.emoji || ''} ${i.name}`.trim(),
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
    subtotal,
    tax,
    total: subtotal + tax,
    config,
  })
}
