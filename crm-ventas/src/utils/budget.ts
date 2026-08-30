import { LOCALE } from './format'
import type { BudgetItem } from '../types'

// Impuesto estándar de los presupuestos (IVA 21% por defecto, configurable por presupuesto)
export const TAX_RATE = 0.21

// Calcula el descuento aplicado según su tipo.
// - 'percentage': descuento = subtotal * (valor / 100)
// - 'fixed': descuento = valor ingresado
// Nunca supera el subtotal ni puede ser negativo.
export function computeDiscount(
  subtotal: number,
  discountType?: 'percentage' | 'fixed',
  discountValue?: number,
): number {
  const value = Number(discountValue) || 0
  if (value <= 0) return 0
  const raw = discountType === 'fixed' ? value : (subtotal * value) / 100
  return Math.min(subtotal, Math.max(0, raw))
}

// Calcula subtotal, IVA, descuento, envío y total.
// Total = Subtotal - Descuento + IVA + Envío.
// Si includeTax es false, el IVA es 0. taxRate se expresa en porcentaje (ej. 21 = 21%).
export function budgetTotals(
  items: { unitPrice: number; quantity: number }[],
  opts?: {
    includeTax?: boolean
    taxRate?: number
    discountType?: 'percentage' | 'fixed'
    discountValue?: number
    shippingCost?: number
  },
) {
  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0)
  const includeTax = opts?.includeTax ?? true
  const rate = (opts?.taxRate ?? Math.round(TAX_RATE * 100)) / 100
  const tax = includeTax ? subtotal * rate : 0
  const discount = computeDiscount(subtotal, opts?.discountType, opts?.discountValue)
  const shipping = Math.max(0, Number(opts?.shippingCost) || 0)
  const total = subtotal - discount + tax + shipping
  return { subtotal, tax, discount, shipping, total }
}

// Pie de página por defecto cuando no hay uno configurado en Configuración
export const DEFAULT_FOOTER = 'Generado con ElectroCRM'

// Formato de dinero en texto plano: "$ 1.499,00" (símbolo argentino)
function plainMoney(value: number): string {
  return `$ ${value.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export interface DocumentTextOptions {
  numberLabel: string
  customerName: string
  date: string
  items: BudgetItem[]
  subtotal: number
  tax: number
  total: number
  // IVA configurable por documento: si es false, NO se muestra la línea de IVA
  includeTax: boolean
  // Porcentaje de IVA usado (ej. 21 = 21%)
  taxRate: number
  // Descuento aplicado y gastos de envío (se muestran solo si > 0)
  discount?: number
  shipping?: number
  // Pie de página personalizado (si viene vacío, se usa DEFAULT_FOOTER)
  footer?: string
}

// Texto PLANO para WhatsApp: sin emojis, sin asteriscos, sin subrayados
// y sin separadores con caracteres especiales. Solo texto simple.
function buildDocumentText(opts: DocumentTextOptions & { docType: string }): string {
  const {
    docType,
    numberLabel,
    customerName,
    date,
    items,
    subtotal,
    tax,
    total,
    includeTax,
    taxRate,
    discount,
    shipping,
    footer,
  } = opts
  const taxLine =
    includeTax && tax > 0 ? [`Impuestos (${Math.round(taxRate)}%): ${plainMoney(tax)}`] : []
  const discountLine = discount && discount > 0 ? [`Descuento: -${plainMoney(discount)}`] : []
  const shippingLine = shipping && shipping > 0 ? [`Envío: ${plainMoney(shipping)}`] : []
  const lines = [
    `${docType} #${numberLabel}`,
    `Cliente: ${customerName}`,
    `Fecha: ${date}`,
    '',
    'Productos:',
    ...items.map(
      (it, i) => `${i + 1}. ${it.name} x${it.quantity} - ${plainMoney(it.unitPrice * it.quantity)}`,
    ),
    '',
    `Subtotal: ${plainMoney(subtotal)}`,
    ...discountLine,
    ...taxLine,
    ...shippingLine,
    `TOTAL: ${plainMoney(total)}`,
    '',
    footer?.trim() || DEFAULT_FOOTER,
  ]
  return lines.join('\n')
}

export function buildBudgetText(opts: DocumentTextOptions): string {
  return buildDocumentText({ docType: 'PRESUPUESTO', ...opts })
}

export function buildReceiptText(opts: DocumentTextOptions): string {
  return buildDocumentText({ docType: 'RECIBO', ...opts })
}

// Link de WhatsApp: wa.me/549[telefono]?text=[mensaje]
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  const number = digits.startsWith('549') ? digits : `549${digits}`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
