import type { Product } from '../types'

// ===== Importación de productos desde CSV (compatible con exportaciones de Tiendanube) =====

export interface CsvImportResult {
  // Productos listos para guardar (sin id: el store lo genera)
  products: Omit<Product, 'id'>[]
  imported: number
  skipped: number
  errors: string[]
}

const NAME_KEYS = ['nombre', 'name', 'titulo', 'title', 'producto', 'product']
const PRICE_KEYS = ['precio', 'price', 'precio de venta']
const COST_KEYS = ['costo', 'cost', 'coste']
const STOCK_KEYS = ['stock', 'cantidad', 'quantity', 'existencia', 'unidades']
const CATEGORY_KEYS = ['categorias', 'categoria', 'categories', 'category']
const BRAND_KEYS = ['marca', 'brand', 'marca del producto']
const BARCODE_KEYS = ['codigo de barras', 'barcode', 'codigo', 'sku', 'codigo del producto']
const DESCRIPTION_KEYS = [
  'descripcion',
  'description',
  'detalle',
  'descripcion corta',
  'descripcion larga',
]

// Parser CSV que respeta comillas, comas y saltos de línea dentro de campos.
// Acepta coma (,) o punto y coma (;) como separador.
export function parseCSV(text: string, delimiter: ',' | ';' = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, '') // quita BOM (Excel)

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Descarta filas completamente vacías
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

// Detecta el separador del CSV mirando la primera línea
function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const commas = (firstLine.match(/,/g) ?? []).length
  const semicolons = (firstLine.match(/;/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

// Normaliza un encabezado: minúsculas, sin acentos, sin símbolos
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Busca la columna cuyo encabezado coincida (exacto primero, luego por inclusión)
function findColumn(headers: string[], keys: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (keys.some((k) => headers[i] === k)) return i
  }
  for (let i = 0; i < headers.length; i++) {
    if (keys.some((k) => headers[i].includes(k))) return i
  }
  return -1
}

// Convierte un valor de precio/stock en número, tolerando formatos como
// "$1.499,00", "1,299.00", "1499", "1.299" o "10".
export function parseMoney(value: string): number {
  const str = String(value).trim().replace(/[$€£¥\s]/g, '')
  if (!str) return NaN
  const hasDot = str.includes('.')
  const hasComma = str.includes(',')
  let normalized = str
  if (hasDot && hasComma) {
    const lastDot = str.lastIndexOf('.')
    const lastComma = str.lastIndexOf(',')
    // El separador decimal es el que aparece más a la derecha
    normalized =
      lastComma > lastDot ? str.replace(/\./g, '').replace(',', '.') : str.replace(/,/g, '')
  } else if (hasComma) {
    normalized = /,\d{1,2}$/.test(str) ? str.replace(',', '.') : str.replace(/,/g, '')
  } else if (hasDot) {
    normalized = /\.\d{1,2}$/.test(str) ? str : str.replace(/\./g, '')
  }
  const num = Number(normalized)
  return Number.isFinite(num) ? num : NaN
}

function parseStock(value: string): number {
  const n = parseMoney(value)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

// Lee el archivo CSV, mapea las columnas y valida nombre + precio.
// Lanza un Error si el formato no tiene las columnas obligatorias.
export async function parseProductsCSV(file: File): Promise<CsvImportResult> {
  const text = await file.text()
  const rows = parseCSV(text, detectDelimiter(text))
  if (rows.length === 0) throw new Error('El archivo está vacío')

  const headers = rows[0].map(normalizeHeader)
  const nameIdx = findColumn(headers, NAME_KEYS)
  const priceIdx = findColumn(headers, PRICE_KEYS)
  if (nameIdx === -1) throw new Error('Falta la columna «Nombre»')
  if (priceIdx === -1) throw new Error('Falta la columna «Precio»')

  const costIdx = findColumn(headers, COST_KEYS)
  const stockIdx = findColumn(headers, STOCK_KEYS)
  const categoryIdx = findColumn(headers, CATEGORY_KEYS)
  const brandIdx = findColumn(headers, BRAND_KEYS)
  const barcodeIdx = findColumn(headers, BARCODE_KEYS)
  const descriptionIdx = findColumn(headers, DESCRIPTION_KEYS)

  const products: Omit<Product, 'id'>[] = []
  const errors: string[] = []
  let skipped = 0

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const cell = (idx: number) => (idx >= 0 ? (row[idx] ?? '').trim() : '')

    const name = cell(nameIdx)
    const price = parseMoney(cell(priceIdx))
    if (!name) {
      skipped++
      errors.push(`Fila ${r + 1}: falta el nombre`)
      continue
    }
    if (!Number.isFinite(price) || price < 0) {
      skipped++
      errors.push(`Fila ${r + 1}: «${name}» tiene un precio inválido`)
      continue
    }

    // Tiendanube puede traer varias categorías separadas por "|": se usa la primera
    const category = cell(categoryIdx).split('|')[0].trim() || 'General'
    const barcode = cell(barcodeIdx)
    const cost = parseMoney(cell(costIdx))

    products.push({
      name,
      description: cell(descriptionIdx),
      category,
      price,
      cost: Number.isFinite(cost) && cost >= 0 ? cost : 0,
      stock: parseStock(cell(stockIdx)),
      brand: cell(brandIdx) || undefined,
      ...(barcode ? { barcode } : {}),
    })
  }

  return { products, imported: products.length, skipped, errors }
}
