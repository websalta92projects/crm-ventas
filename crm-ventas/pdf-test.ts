import { generateDocumentPDF } from './src/utils/documentPDF'
import { DEFAULT_CONFIG } from './src/store/configStore'

const config = { ...DEFAULT_CONFIG, logo: '' }

await generateDocumentPDF({
  type: 'PRESUPUESTO',
  number: 1001,
  customerName: 'Lucas Pérez',
  customerPhone: '5551234567',
  date: '28 ago 2026',
  lines: [
    { name: 'Audífonos Pro Bluetooth', quantity: 2, unitPrice: 1499 },
    { name: 'Cargador 65W USB-C', quantity: 1, unitPrice: 399 },
    { name: 'Funda de cuero para iPhone', quantity: 3, unitPrice: 249 },
  ],
  subtotal: 3743,
  tax: 786.03,
  total: 4529.03,
  config,
})

console.log('PDF generado correctamente')
