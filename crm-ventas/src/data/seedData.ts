import type { Budget, Customer, Product, Sale, SaleStatus } from '../types'

// Catálogo inicial de productos electrónicos (Fase 2: con descripción)
export const initialProducts: Product[] = [
  {
    id: 'p1',
    name: 'Laptop Pro 14"',
    description: 'Laptop ultraligera con procesador de última generación, 16 GB RAM y SSD de 512 GB.',
    category: 'Computación',
    price: 1499,
    cost: 1050,
    stock: 12,
    emoji: '💻',
    barcode: '7501234560012',
  },
  {
    id: 'p2',
    name: 'Smartphone X Ultra',
    description: 'Pantalla AMOLED 6.7", cámara triple de 108 MP y batería de 5000 mAh.',
    category: 'Telefonía',
    price: 999,
    cost: 700,
    stock: 25,
    emoji: '📱',
    barcode: '7501234560029',
  },
  {
    id: 'p3',
    name: 'Tablet Air 10"',
    description: 'Tablet ligera ideal para estudio y entretenimiento, compatible con lápiz táctil.',
    category: 'Computación',
    price: 549,
    cost: 385,
    stock: 18,
    emoji: '📲',
    barcode: '7501234560036',
  },
  {
    id: 'p4',
    name: 'Auriculares Inalámbricos',
    description: 'Auriculares Bluetooth con cancelación activa de ruido y 30 h de batería.',
    category: 'Audio',
    price: 199,
    cost: 120,
    stock: 40,
    emoji: '🎧',
    barcode: '7501234560043',
  },
  {
    id: 'p5',
    name: 'Smartwatch Serie 6',
    description: 'Reloj inteligente con GPS, monitor de ritmo cardiaco y resistencia al agua.',
    category: 'Wearables',
    price: 329,
    cost: 210,
    stock: 22,
    emoji: '⌚',
    barcode: '7501234560050',
  },
  {
    id: 'p6',
    name: 'Smart TV 55" 4K',
    description: 'Televisor 4K UHD con HDR, sistema operativo inteligente y control por voz.',
    category: 'Televisores',
    price: 799,
    cost: 540,
    stock: 8,
    emoji: '📺',
    barcode: '7501234560067',
  },
  {
    id: 'p7',
    name: 'Cámara Mirrorless',
    description: 'Cámara sin espejo con sensor full-frame y grabación 4K a 60 fps.',
    category: 'Fotografía',
    price: 1199,
    cost: 820,
    stock: 6,
    emoji: '📷',
    barcode: '7501234560074',
  },
  {
    id: 'p8',
    name: 'Consola de Videojuegos',
    description: 'Consola de nueva generación con SSD ultrarrápido y soporte 4K/120 fps.',
    category: 'Gaming',
    price: 499,
    cost: 380,
    stock: 15,
    emoji: '🎮',
  },
  {
    id: 'p9',
    name: 'Teclado Mecánico RGB',
    description: 'Teclado mecánico con switches red, retroiluminación RGB y reposamuñecas.',
    category: 'Accesorios',
    price: 129,
    cost: 75,
    stock: 35,
    emoji: '⌨️',
  },
  {
    id: 'p10',
    name: 'Mouse Gamer',
    description: 'Mouse ergonómico de 16 000 DPI con 8 botones programables y cable paracord.',
    category: 'Accesorios',
    price: 79,
    cost: 45,
    stock: 50,
    emoji: '🖱️',
  },
]

// Peso de demanda (hace que algunos productos se vendan más que otros en la demo)
const weights = [0.7, 1.0, 0.5, 1.4, 0.8, 0.3, 0.25, 0.6, 1.1, 1.2]

// Presupuestos de ejemplo (Fase 5)
export const initialBudgets: Budget[] = [
  {
    id: 'b1',
    number: 1001,
    customerId: 'c1',
    items: [
      { productId: 'p2', name: 'Smartphone X Ultra', emoji: '📱', quantity: 1, unitPrice: 999 },
      { productId: 'p9', name: 'Teclado Mecánico RGB', emoji: '⌨️', quantity: 1, unitPrice: 129 },
    ],
    subtotal: 1128,
    tax: 236.88,
    total: 1302.08,
    status: 'enviado',
    includeTax: true,
    taxRate: 21,
    discountType: 'percentage',
    discountValue: 10,
    shippingCost: 50,
    internalNotes: 'Cliente pidió envío express y espera llamada de confirmación',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
  },
  {
    id: 'b2',
    number: 1002,
    customerId: 'c3',
    items: [{ productId: 'p1', name: 'Laptop Pro 14"', emoji: '💻', quantity: 1, unitPrice: 1499 }],
    subtotal: 1499,
    tax: 314.79,
    total: 1813.79,
    status: 'borrador',
    includeTax: true,
    taxRate: 21,
    internalNotes: 'Seguimiento: llamar el jueves para confirmar la compra',
    createdAt: '2026-08-22T16:30:00.000Z',
    updatedAt: '2026-08-22T16:30:00.000Z',
  },
  {
    id: 'b3',
    number: 1003,
    customerId: 'c5',
    items: [
      { productId: 'p4', name: 'Auriculares Inalámbricos', emoji: '🎧', quantity: 2, unitPrice: 199 },
      { productId: 'p10', name: 'Mouse Gamer', emoji: '🖱️', quantity: 1, unitPrice: 79 },
    ],
    subtotal: 477,
    tax: 100.17,
    total: 577.17,
    status: 'aceptado',
    includeTax: true,
    taxRate: 21,
    createdAt: '2026-08-24T09:00:00.000Z',
    updatedAt: '2026-08-24T11:00:00.000Z',
  },
  {
    id: 'b4',
    number: 1004,
    customerId: 'c2',
    items: [{ productId: 'p6', name: 'Smart TV 55" 4K', emoji: '📺', quantity: 1, unitPrice: 799 }],
    subtotal: 799,
    tax: 167.79,
    total: 966.79,
    status: 'rechazado',
    includeTax: true,
    taxRate: 21,
    createdAt: '2026-08-25T14:00:00.000Z',
    updatedAt: '2026-08-25T15:00:00.000Z',
  },
]

// Clientes de ejemplo (Fase 3)
export const initialCustomers: Customer[] = [
  {
    id: 'c1',
    name: 'Carlos Gómez',
    phone: '55 1234 5678',
    email: 'carlos.gomez@mail.com',
    address: 'Av. Reforma 123, CDMX',
    createdAt: '2026-01-12T10:00:00.000Z',
  },
  {
    id: 'c2',
    name: 'María Fernández',
    phone: '55 2345 6789',
    email: 'maria.fernandez@mail.com',
    address: 'Calle Juárez 45, CDMX',
    createdAt: '2026-01-15T09:30:00.000Z',
  },
  {
    id: 'c3',
    name: 'José Ramírez',
    phone: '33 3456 7890',
    email: 'jose.ramirez@mail.com',
    address: 'Blvd. de la Luz 789, Guadalajara',
    createdAt: '2026-02-01T12:00:00.000Z',
  },
  {
    id: 'c4',
    name: 'Ana Torres',
    phone: '81 4567 8901',
    email: 'ana.torres@mail.com',
    address: 'Av. Industrial 321, Monterrey',
    createdAt: '2026-02-10T16:45:00.000Z',
  },
  {
    id: 'c5',
    name: 'Luis Sánchez',
    phone: '33 5678 9012',
    email: 'luis.sanchez@mail.com',
    address: 'Calle Hidalgo 654, Guadalajara',
    createdAt: '2026-03-05T11:15:00.000Z',
  },
  {
    id: 'c6',
    name: 'Sofía Morales',
    phone: '55 6789 0123',
    email: 'sofia.morales@mail.com',
    address: 'Av. Universidad 987, CDMX',
    createdAt: '2026-03-20T14:00:00.000Z',
  },
]

// PRNG determinista: genera siempre la misma demo (misma semilla = mismos datos)
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickWeighted(rand: () => number): Product {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let i = 0; i < initialProducts.length; i++) {
    r -= weights[i]
    if (r <= 0) return initialProducts[i]
  }
  return initialProducts[0]
}

// Fallback por si crypto.randomUUID no está disponible (http no-seguro)
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// Cantidad de días de ventas demo a generar (menos datos = app más ligera y rápida)
const DAYS = 7

// Genera ventas demo de los últimos DAYS días (de 2 a 8 ventas por día)
export function generateSeedSales(customers: Customer[] = initialCustomers): Sale[] {
  const rand = mulberry32(20260101)
  const sales: Sale[] = []
  const now = new Date()

  for (let d = DAYS - 1; d >= 0; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d)
    const numSales = 2 + Math.floor(rand() * 7)

    for (let s = 0; s < numSales; s++) {
      const product = pickWeighted(rand)
      const quantity = 1 + Math.floor(rand() * 2)
      const saleDate = new Date(day)
      saleDate.setHours(9 + Math.floor(rand() * 11), Math.floor(rand() * 60), Math.floor(rand() * 60), 0)

      // Estado ponderado: 15% pendiente de pago, 45% pagado, 40% entregado
      const statusRoll = rand()
      const status: SaleStatus =
        statusRoll < 0.15 ? 'pendiente_pago' : statusRoll < 0.6 ? 'pagado' : 'entregado'

      // 15% de ventas "sin cliente" (mostrador)
      const customerId =
        customers.length > 0 && rand() > 0.15
          ? customers[Math.floor(rand() * customers.length)].id
          : ''

      // Ocasionalmente una venta trae 2 productos (simula ventas desde presupuesto)
      const secondProduct = rand() < 0.2 ? pickWeighted(rand) : null

      sales.push({
        id: uid(),
        items: [
          {
            productId: product.id,
            name: product.name,
            emoji: product.emoji,
            quantity,
            unitPrice: product.price,
            unitCost: product.cost,
          },
          ...(secondProduct
            ? [
                {
                  productId: secondProduct.id,
                  name: secondProduct.name,
                  emoji: secondProduct.emoji,
                  quantity: 1,
                  unitPrice: secondProduct.price,
                  unitCost: secondProduct.cost,
                },
              ]
            : []),
        ],
        date: saleDate.toISOString(),
        customerId,
        status,
      })
    }
  }
  return sales
}
