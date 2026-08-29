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

export async function generateDocumentPDF(data: DocData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()
  const color = hexToRgb(data.config.color) ?? ([139, 92, 246] as [number, number, number])
  const gray = [148, 163, 184] as [number, number, number]
  const dark = [30, 41, 59] as [number, number, number]
  const companyInitial = (data.config.name.trim()[0] ?? 'E').toUpperCase()

  const drawLogoInitial = () => {
    doc.setFillColor(255, 255, 255)
    doc.circle(25, 21, 13, 'F')
    doc.setTextColor(...color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(companyInitial, 25, 25, { align: 'center' })
  }

  // Dibuja el logo manteniendo su proporción original (sin deformar).
  // Límites: maxWidth 60mm y maxHeight 40mm.
  const MAX_LOGO_W = 60
  const MAX_LOGO_H = 40
  const HEADER_H = 42

  const addLogo = () => {
    try {
      const props = doc.getImageProperties(data.config.logo)
      if (!props || props.width <= 0 || props.height <= 0) {
        drawLogoInitial()
        return
      }
      const aspectRatio = props.width / props.height

      // Si es más ancha que alta → ajustar por ancho; si es más alta → ajustar por alto
      let w = MAX_LOGO_W
      let h = w / aspectRatio
      if (h > MAX_LOGO_H) {
        h = MAX_LOGO_H
        w = h * aspectRatio
      }

      // Centrar verticalmente en la banda del encabezado
      const x = 12
      const y = Math.max(1, (HEADER_H - h) / 2)

      doc.addImage(data.config.logo, 'PNG', x, y, w, h)
    } catch {
      // Si la imagen no se puede leer, se usa la inicial de la empresa
      drawLogoInitial()
    }
  }

  // ----- Encabezado (banda de color + logo) -----
  doc.setFillColor(...color)
  doc.rect(0, 0, 210, HEADER_H, 'F')

  if (data.config.logo) {
    addLogo()
  } else {
    drawLogoInitial()
  }

  // Datos de la empresa
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(data.config.name, 100, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(data.config.address, 100, 18)
  doc.text(`Tel: ${data.config.phone}`, 100, 22)
  doc.text(`Email: ${data.config.email}`, 100, 26)

  // ----- Título del documento -----
  doc.setTextColor(...color)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(`${data.type} #${data.number}`, 14, 56)

  // ----- Cliente y fecha -----
  doc.setTextColor(...dark)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Fecha: ${data.date}`, 14, 64)
  doc.text(`Cliente: ${data.customerName}`, 14, 70)
  doc.text(`Teléfono: ${data.customerPhone || '—'}`, 14, 76)

  // ----- Detalle de productos -----
  autoTable(doc, {
    startY: 84,
    head: [['Cant.', 'Descripción', 'Precio', 'Subtotal']],
    body: data.lines.map((l) => [
      String(l.quantity),
      l.name,
      formatMoney(l.unitPrice),
      formatMoney(l.unitPrice * l.quantity),
    ]),
    theme: 'striped',
    headStyles: { fillColor: color },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 34 },
    },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // ----- Totales -----
  let y = finalY + 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...dark)
  doc.text('Subtotal:', 130, y)
  doc.text(formatMoney(data.subtotal), 196, y, { align: 'right' })
  y += 6
  doc.text(`IVA (${Math.round(TAX_RATE * 100)}%):`, 130, y)
  doc.text(formatMoney(data.tax), 196, y, { align: 'right' })
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...color)
  doc.text('TOTAL:', 130, y)
  doc.text(formatMoney(data.total), 196, y, { align: 'right' })

  // ----- Pie de página -----
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)
    doc.text(data.config.footer?.trim() || 'Generado con ElectroCRM', 14, 290)
    doc.text(`Página ${i} de ${pages}`, 196, 290, { align: 'right' })
  }

  doc.save(`${data.type.toLowerCase()}-${data.number}.pdf`)
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
