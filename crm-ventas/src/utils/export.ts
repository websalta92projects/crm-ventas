import type { Budget, Customer, Product, Sale } from '../types'
import { saleProfit, saleTotal, saleUnits } from './sale'
import { formatDateOnly, formatMoney } from './format'
import {
  getLowStockProducts,
  getPeriodSummary,
  getSalesByProduct,
  getTopCustomers,
} from './reports'

// ===== Descarga directa de archivos =====

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvEscape(value: string | number): string {
  const s = String(value ?? '')
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function csv(rows: (string | number)[][]) {
  return '\uFEFF' + rows.map((r) => r.map(csvEscape).join(',')).join('\n')
}

const today = () => new Date().toISOString().slice(0, 10)

// ===== Exportación CSV =====

export function exportProductsCSV(products: Product[]) {
  const header = ['id', 'nombre', 'marca', 'descripcion', 'categoria', 'precio_venta', 'costo', 'stock']
  const rows = products.map((p) => [
    p.id,
    p.name,
    p.brand ?? '',
    p.description,
    p.category,
    p.price,
    p.cost,
    p.stock,
  ])
  downloadFile(`invoicedomatic-productos-${today()}.csv`, csv([header, ...rows]), 'text/csv;charset=utf-8')
}

export function exportSalesCSV(sales: Sale[], products: Product[], customers: Customer[]) {
  void products
  const customerById = new Map(customers.map((c) => [c.id, c]))
  const header = [
    'id', 'fecha', 'productos', 'cliente', 'unidades',
    'estado', 'total', 'ganancia',
  ]
  const rows = [...sales]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => [
      s.id,
      formatDateOnly(s.date),
      s.items.map((i) => `${i.name} x${i.quantity}`).join(' | '),
      customerById.get(s.customerId)?.name ?? 'Sin cliente',
      saleUnits(s),
      s.status,
      saleTotal(s),
      saleProfit(s),
    ])
  downloadFile(`invoicedomatic-ventas-${today()}.csv`, csv([header, ...rows]), 'text/csv;charset=utf-8')
}

export function exportCustomersCSV(customers: Customer[]) {
  const header = ['id', 'nombre', 'telefono', 'email', 'direccion', 'creado']
  const rows = customers.map((c) => [c.id, c.name, c.phone, c.email, c.address, c.createdAt.slice(0, 10)])
  downloadFile(`invoicedomatic-clientes-${today()}.csv`, csv([header, ...rows]), 'text/csv;charset=utf-8')
}

export function exportBudgetsCSV(budgets: Budget[], customers: Customer[]) {
  const customerById = new Map(customers.map((c) => [c.id, c]))
  const header = ['id', 'folio', 'cliente', 'productos', 'subtotal', 'impuestos', 'total', 'estado', 'fecha']
  const rows = budgets.map((b) => [
    b.id,
    b.number,
    customerById.get(b.customerId)?.name ?? 'Sin cliente',
    b.items.map((i) => `${i.name} x${i.quantity}`).join(' | '),
    b.subtotal,
    b.tax,
    b.total,
    b.status,
    formatDateOnly(b.createdAt),
  ])
  downloadFile(`invoicedomatic-presupuestos-${today()}.csv`, csv([header, ...rows]), 'text/csv;charset=utf-8')
}

// ===== Respaldo JSON =====

export function exportBackupJSON(data: {
  products: Product[]
  sales: Sale[]
  customers: Customer[]
  budgets: Budget[]
}) {
  const payload = {
    app: 'electro-crm',
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    ...data,
  }
  downloadFile(
    `invoicedomatic-respaldo-${today()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  )
}

// Migra una venta del esquema viejo (un producto) al nuevo (items[])
function migrateSale(s: any): Sale {
  if (Array.isArray(s.items)) {
    return { ...s, items: s.items.map((i: any) => ({ ...i })) }
  }
  return {
    id: s.id,
    customerId: s.customerId ?? '',
    status: (s.status === 'pendiente' ? 'pendiente_pago' : s.status) as Sale['status'],
    date: s.date,
    budgetId: s.budgetId,
    items: [
      {
        productId: s.productId,
        name: s.name ?? 'Producto',
        emoji: '📦',
        quantity: s.quantity ?? 1,
        unitPrice: s.unitPrice ?? 0,
        unitCost: s.unitCost ?? 0,
      },
    ],
  }
}

export function parseBackupJSON(text: string): {
  products: Product[]
  sales: Sale[]
  customers: Customer[]
  budgets: Budget[]
} {
  const data = JSON.parse(text)
  if (
    !data ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.sales) ||
    !Array.isArray(data.customers)
  ) {
    throw new Error('El archivo no es un respaldo válido de InvoiceDomatic')
  }
  return {
    products: data.products,
    sales: data.sales.map(migrateSale),
    customers: data.customers,
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
  }
}

// ===== Reporte PDF (resumen ejecutivo) =====

export interface PdfOptions {
  products: Product[]
  sales: Sale[]
  customers: Customer[]
  from: string
  to: string
}

export async function exportReportPDF({ products, sales, customers, from, to }: PdfOptions) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()
  const periodLabel =
    from || to ? `${from || 'inicio'} → ${to || 'hoy'}` : 'Todo el historial'
  const summary = getPeriodSummary(sales, from, to)
  const topProducts = getSalesByProduct(sales, products, 5)
  const topCustomers = getTopCustomers(sales, customers, 5)
  const lowStock = getLowStockProducts(products, 5)

  const violet = [139, 92, 246] as [number, number, number]
  const rose = [244, 63, 94] as [number, number, number]
  const dark = [30, 41, 59] as [number, number, number]
  const gray = [148, 163, 184] as [number, number, number]

  // Banda superior
  doc.setFillColor(...violet)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('InvoiceDomatic — Resumen Ejecutivo', 14, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Generado: ${new Date().toLocaleString('es')}`, 14, 19)
  doc.text(`Período: ${periodLabel}`, 14, 24)

  doc.setTextColor(...dark)

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // Indicadores
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Indicadores del período', 14, 40)
  autoTable(doc, {
    startY: 44,
    head: [['Ventas', 'Ganancia neta', 'Margen', 'Pedidos', 'Artículos', 'Clientes']],
    body: [[
      formatMoney(summary.total),
      formatMoney(summary.profit),
      `${summary.margin.toFixed(1)}%`,
      String(summary.count),
      String(summary.items),
      String(summary.activeCustomers),
    ]],
    theme: 'striped',
    headStyles: { fillColor: violet },
    styles: { fontSize: 9, cellPadding: 2 },
  })

  // Top productos
  doc.text('Top 5 productos', 14, lastY() + 12)
  autoTable(doc, {
    startY: lastY() + 16,
    head: [['Producto', 'Unidades', 'Ingresos']],
    body: topProducts.length
      ? topProducts.map((p) => [p.name, String(p.value), formatMoney(p.revenue)])
      : [['Sin ventas en el período', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: violet },
    styles: { fontSize: 9, cellPadding: 2 },
  })

  // Top clientes
  doc.text('Top 5 clientes', 14, lastY() + 12)
  autoTable(doc, {
    startY: lastY() + 16,
    head: [['Cliente', 'Compras', 'Total gastado']],
    body: topCustomers.length
      ? topCustomers.map((c) => [c.customer.name, String(c.purchases), formatMoney(c.total)])
      : [['Sin clientes en el período', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: violet },
    styles: { fontSize: 9, cellPadding: 2 },
  })

  // Stock bajo
  doc.text('Productos con stock bajo (≤ 5)', 14, lastY() + 12)
  autoTable(doc, {
    startY: lastY() + 16,
    head: [['Producto', 'Categoría', 'Stock']],
    body: lowStock.length
      ? lowStock.map((p) => [p.name, p.category, String(p.stock)])
      : [['Inventario saludable', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: rose },
    styles: { fontSize: 9, cellPadding: 2 },
  })

  // Pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...gray)
    doc.text(`InvoiceDomatic · página ${i} de ${pageCount}`, 14, 290)
  }

  doc.save(`invoicedomatic-reporte-${today()}.pdf`)
}

