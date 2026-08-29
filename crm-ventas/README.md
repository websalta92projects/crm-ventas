# ⚡ ElectroCRM — Manual de Supervivencia

CRM de ventas para vendedores de **productos electrónicos**.

- **FASE 1 (completada ✅):** dashboard de KPIs, gráficos, registro rápido de ventas y asistente motivacional.
- **FASE 2 (completada ✅):** CRUD completo de productos con búsqueda, filtros y eliminación con confirmación.
- **FASE 3 (completada ✅):** CRUD de ventas avanzado (estados, filtros por fecha, ajuste de stock) y clientes con historial de compras.
- **FASE 4 (completada ✅):** reportes avanzados con gráficos, exportación a CSV/PDF, respaldo e importación JSON.
- **REDISEÑO (completado ✅):** flujo **Presupuesto → Venta** con estados, carrito multi-producto, IVA 21% y acciones de pago/entrega.
- **PDF PROFESIONAL (completado ✅):** presupuestos y recibos en PDF con logo, datos de empresa, folios automáticos y envío por WhatsApp + página de Configuración.

---

## 🧰 Stack de tecnologías

| Tecnología          | Uso                                              |
| ------------------- | ------------------------------------------------ |
| React 18            | Interfaz de usuario                              |
| TypeScript 5.6      | Tipado estático                                  |
| Vite 5              | Bundler y servidor de desarrollo                 |
| Tailwind CSS 3.4    | Estilos (Glassmorphism + modo oscuro)            |
| Zustand 5           | Estado global con persistencia en LocalStorage   |
| Recharts 2          | Gráficos (ventas 30 días + top productos)        |
| Framer Motion 11    | Animaciones suaves                               |
| Lucide React        | Iconos                                          |
| React Hot Toast     | Notificaciones                                   |
| jsPDF + autotable   | Reporte PDF (resumen ejecutivo)                 |

---

## ✅ Requisitos previos

- **Node.js 18+** (recomendado 20+). Verifica con `node -v`.
- **npm 9+**. Verifica con `npm -v`.

---

## 🚀 Cómo correrlo

```bash
# 1. Entrar a la carpeta del proyecto
cd crm-ventas

# 2. Instalar dependencias (solo la primera vez)
npm install

# 3. Modo desarrollo
npm run dev
# → abre http://localhost:5173

# 4. Build de producción
npm run build

# 5. Previsualizar el build
npm run preview
```

### Otros comandos útiles

```bash
npm run typecheck   # Solo revisa tipos de TypeScript
npm run dev -- --port 5174   # Si el puerto 5173 está ocupado
```

---

## 📁 Estructura de carpetas

```
crm-ventas/
├── index.html                     # HTML raíz (fuente Inter, modo oscuro por defecto)
├── package.json                   # Dependencias y scripts
├── tsconfig.json                  # Configuración de TypeScript
├── vite.config.ts                 # Configuración de Vite
├── tailwind.config.js             # Configuración de Tailwind
├── postcss.config.js              # PostCSS + Autoprefixer
├── src/
│   ├── main.tsx                   # Punto de entrada (ReactDOM + Toaster)
│   ├── App.tsx                    # Layout general (Sidebar + Header + Dashboard)
│   ├── index.css                  # Estilos globales + utilidades glass
│   ├── types/
│   │   └── index.ts               # Tipos: Product, Sale, SalesSummary…
│   ├── store/
│   │   ├── salesStore.ts          # Estado global Zustand + persistencia
│   │   └── configStore.ts         # Config de la empresa (clave company-config)
│   ├── data/
│   │   ├── seedData.ts            # Catálogo y ventas demo (deterministas)
│   │   └── motivationalMessages.ts# Frases del asistente
│   ├── utils/
│   │   ├── format.ts              # Formato de moneda y fechas
│   │   ├── stats.ts               # Cálculo de KPIs (solo ventas pagadas)
│   │   ├── saleStatus.ts          # Estados de venta (Pendiente/Pagado/Entregado/Cancelado)
│   │   ├── budgetStatus.ts        # Estados de presupuesto (Borrador/Enviado/Aceptado/Rechazado)
│   │   ├── sale.ts                # Helpers multi-producto (total, ganancia, unidades)
│   │   ├── budget.ts              # IVA 21%, totales y texto para WhatsApp
│   │   ├── reports.ts             # Agregaciones de reportes
│   │   ├── export.ts              # CSV / PDF / respaldo JSON
│   │   └── documentPDF.ts         # PDF profesional de presupuestos y recibos
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Background.tsx     # Fondo con gradientes animados
│   │   │   ├── Sidebar.tsx        # Barra lateral (responsive)
│   │   │   └── Header.tsx         # Encabezado + botón "Nueva venta"
│   │   ├── dashboard/
│   │   │   ├── KpiCard.tsx        # Tarjeta de KPI
│   │   │   ├── SalesChart.tsx     # Gráfico ventas últimas 30 días
│   │   │   ├── TopProductsChart.tsx # Donut top productos
│   │   │   └── RecentSales.tsx    # Tabla de últimas ventas
│   │   ├── assistant/
│   │   │   └── VirtualAssistant.tsx # Asistente motivacional flotante
│   │   ├── sales/
│   │   │   ├── SaleFormModal.tsx  # Venta desde presupuesto o venta rápida (multi-producto)
│   │   │   └── StatusBadge.tsx    # Badge de estado (ventas y presupuestos)
│   │   ├── budgets/
│   │   │   └── BudgetFormModal.tsx # Presupuesto: carrito, IVA, cliente, WhatsApp (Fase 5)
│   │   ├── products/
│   │   │   ├── ProductCard.tsx    # Tarjeta de producto (Fase 2)
│   │   │   ├── ProductFormModal.tsx # Formulario crear/editar (Fase 2)
│   │   │   └── ConfirmModal.tsx   # Confirmación reutilizable
│   │   └── customers/
│   │       ├── CustomerCard.tsx   # Tarjeta de cliente (Fase 3)
│   │       ├── CustomerFormModal.tsx # Formulario crear/editar (Fase 3)
│   │       └── CustomerHistoryModal.tsx # Historial de compras (Fase 3)
│   │   └── reports/
│   │       ├── SalesByMonthChart.tsx   # Barras ventas por mes (Fase 4)
│   │       ├── SalesByProductChart.tsx # Torta ventas por producto (Fase 4)
│   │       ├── SalesByCustomerChart.tsx# Barras ventas por cliente (Fase 4)
│   │       ├── TopCustomersList.tsx    # Top 5 clientes (Fase 4)
│   │       ├── LowStockAlerts.tsx      # Alerta stock bajo (Fase 4)
│   │       └── BackupPanel.tsx         # Exportar / importar (Fase 4)
│   └── pages/
│       ├── Dashboard.tsx          # KPIs (solo pagadas) + presupuestos activos
│       ├── Products.tsx           # CRUD de productos (Fase 2)
│       ├── Sales.tsx              # CRUD de ventas + acciones de estado (Fase 5)
│       ├── Budgets.tsx            # CRUD de presupuestos (Fase 5)
│       ├── Customers.tsx          # CRUD de clientes (Fase 3)
│       ├── Reports.tsx            # Reportes y exportación (Fase 4)
│       └── Settings.tsx           # Configuración: logo, empresa, folios (Fase 6)
```

---

## 🧠 Cómo funciona el estado (Zustand + persistencia)

- Todo el estado vive en `src/store/salesStore.ts`.
- Se guarda automáticamente en **LocalStorage** bajo la clave **`electro-crm-v1`**.
- Al primer arranque se generan **~7 días de ventas demo** (deterministas: mismos datos
  siempre, con la misma semilla), junto con **productos** y **clientes** de ejemplo. Después, lo que hagas se persiste.
- Para **borrar los datos y volver a la demo**:
  1. Abre DevTools → pestaña **Application** → **Local Storage** → `http://localhost:5173`
  2. Elimina la clave `electro-crm-v1` y recarga la página.

**Acciones del store:**
- `saveSale({ productId, quantity, customerId, status, date, id? })` → crea o edita una venta ajustando el stock automáticamente (incluso si cambia de producto).
- `removeSale(id)` → elimina una venta y **restaura el stock** del producto.
- `saveProduct(data)` → crea o actualiza un producto (si `data.id` existe, edita).
- `removeProduct(id)` → elimina un producto del catálogo.
- `saveCustomer(data)` → crea o actualiza un cliente.
- `removeCustomer(id)` → elimina un cliente.
- `saveBudget({ customerId, items, status, id? })` → crea o actualiza un presupuesto (no toca stock).
- `setBudgetStatus(id, status)` → cambia el estado de un presupuesto.
- `setSaleStatus(id, status)` → cambia el estado de una venta (cancelar restaura stock).
- `restoreData(data)` → importa un respaldo completo (productos, ventas, clientes, presupuestos).
- `resetAllData()` → restaura productos, ventas y clientes demo.
- `resetData()` → regenera las ventas demo.

---

## 📦 FASE 2 — CRUD de productos

**Nuevas funcionalidades (vista "Productos" del menú lateral):**
- **Listado de productos** en tarjetas glass con precio de venta, costo, stock, margen y badge de "Stock bajo".
- **Búsqueda por nombre** en vivo + **filtro por categoría** (las categorías se derivan solas de los productos existentes).
- **Crear / editar producto** con campos: nombre, descripción, categoría (con sugerencias), precio de venta, precio de costo, stock e icono (emoji). Incluye vista previa de margen y ganancia por unidad.
- **Eliminación con confirmación** que avisa si el producto tiene ventas asociadas.
- **Restaurar datos demo** con un clic (botón ↺ en la barra de herramientas).

> El catálogo inicial trae **10 productos electrónicos** con descripción. El modelo `Product` ahora incluye `description`.

---

## 🧾 FASE 3 — Ventas avanzadas y clientes

**Vista "Ventas":**
- **Historial completo** en tabla con producto, cliente, fecha, estado, cantidad, total y ganancia.
- **Búsqueda por producto** en vivo y **filtros por estado** (pendiente / pagado / entregado) y por **rango de fechas**.
- **Registrar / editar venta** con producto, cantidad, cliente, estado y fecha, con **descuento automático de stock** (y ajuste correcto si cambias de producto al editar).
- **Eliminar venta** con confirmación: el stock se **restaura** automáticamente.
- El botón "Nueva venta" del Dashboard ahora abre este mismo formulario completo.

**Vista "Clientes":**
- **CRUD completo**: nombre, teléfono, email y dirección (tarjetas con avatar de iniciales).
- **Historial de compras por cliente**: modal con todas sus ventas, total de compras, artículos y monto gastado.
- Búsqueda por nombre, email o teléfono, y aviso al eliminar si el cliente tiene compras asociadas.

> La venta ahora guarda `customerId` y `status`. Todo se persiste en la clave `electro-crm-v1` (versión 4).

---

## 📊 FASE 4 — Reportes, exportación y respaldo

**Vista "Reportes" (menú lateral):**
- **Ganancia neta por período:** selector de fechas (desde → hasta) que recalcula KPIs: ventas, ganancia neta, margen, ticket promedio y clientes activos.
- **Ventas por mes** (gráfico de barras) y **por producto** (gráfico de torta).
- **Ventas por cliente** (barras horizontales) y **Top 5 clientes** por volumen de compra (ranking con medallas).
- **Productos con stock bajo** (≤ 5 unidades): alerta visual con tarjetas ámbar/rojas.

**Exportación:**
- **CSV** de productos, ventas y clientes (descarga directa, compatible con Excel).
- **PDF** "Resumen ejecutivo" con jsPDF: indicadores del período, top productos, top clientes y stock bajo (se carga solo al usarlo).

**Respaldo de datos:**
- **Exportar JSON**: descarga todos los datos (productos, ventas, clientes).
- **Importar JSON**: restaura un respaldo previo (botón en el panel "Exportación y respaldo").

> Los archivos se generan con el prefijo `electrocrm-*` y la fecha. El PDF usa acentos correctamente (codificación WinAnsi).

---

## 🔁 Flujo presupuesto → venta (rediseño)

**Vista "Presupuestos":**
- Estados: **Borrador → Enviado → Aceptado / Rechazado** (badges con iconos en la lista).
- `BudgetFormModal.tsx`: **búsqueda de productos en vivo** + **carrito** (cantidad, precio unitario, subtotal), resumen con **impuestos del 21%**, **cliente con buscador y alta rápida**.
- Botones: **📋 Copiar presupuesto** (texto formateado para WhatsApp), **💾 Guardar borrador**, **📤 Enviar presupuesto**.
- Un presupuesto **Aceptado** muestra el botón 🛒 **"Crear venta"** que salta a Ventas con el presupuesto precargado.

**Vista "Ventas" (modificada):**
- Estados: **Pendiente de pago → Pagado → Entregado** (+ **Cancelado**, que restaura el stock).
- Se crea **desde un presupuesto** (selector con presupuestos Enviados/Aceptados) o como **Venta rápida** sin presupuesto.
- Estado inicial al crear: **Pendiente de pago**.
- Acciones rápidas por fila: **Marcar Pagado**, **Marcar Entregado**, **Cancelar**.

**Dashboard (modificado):**
- "Ventas de hoy", "Ventas del mes", "Ganancia neta" y "Producto estrella" se calculan **solo con ventas PAGADAS**.
- Nueva tarjeta **"Presupuestos activos"** (Enviados + Aceptados).

**Integración:**
- Al crear una venta desde un presupuesto, el presupuesto pasa a **Aceptado** automáticamente.
- El **stock se descuenta al crear la venta** (nunca al crear el presupuesto). Al cancelar una venta, el stock se restaura.
- Las ventas ahora soportan **varios productos** (`items[]`) — los reportes, CSV, PDF, historial de clientes y respaldos se actualizaron (los respaldos viejos se migran al importar).

---

## 📄 PDF profesional, WhatsApp y Configuración

**Clientes:**
- El **teléfono es obligatorio** en `CustomerFormModal.tsx` (formato: solo números, espacios y guiones) y se muestra en su tarjeta.

**Presupuestos (`BudgetFormModal` y lista):**
- Botón **📄 Generar PDF**: documento profesional con **logo**, **datos de la empresa**, **datos del cliente**, **tabla de productos** (cantidad, precio, subtotal), **totales** (subtotal, IVA 21%, total), **número** y **fecha**.
- Botón **📤 Enviar por WhatsApp**: abre `wa.me/549[telefono]?text=[resumen]` (el PDF se adjunta manualmente en WhatsApp Web).
- En la lista de presupuestos también hay un botón de **descarga PDF**.

**Ventas pagadas:**
- Cuando una venta está **Pagada** aparecen **📄 Recibo PDF** y **📤 Enviar recibo por WhatsApp**. El folio del recibo se toma de la Configuración y se **incrementa automáticamente** (se guarda en la venta para que no se repita).

**Configuración (menú lateral activado):**
- `src/pages/Settings.tsx` + `src/store/configStore.ts` (persistido en **`company-config`**):
  - **Logo** (input file → Base64), **nombre**, **dirección**, **teléfono**, **email**.
  - **Color principal** (selector de color) que tiñe el encabezado y la tabla del PDF.
  - **Pie de página** personalizado.
  - **Número de inicio** para presupuestos (ej. 1001) y para recibos (ej. 1458) — los contadores **se incrementan solos** al crear cada documento.
  - Vista previa en vivo del encabezado del documento.

> La generación usa `jsPDF` + `jspdf-autotable` (carga perezosa). Los PDFs se nombran `presupuesto-XXXX.pdf` / `recibo-XXXX.pdf`.

---

## 🎨 Diseño

- **Glassmorphism:** tarjetas con `backdrop-blur`, bordes semitransparentes y fondo de blobs
  de gradiente animados (clases `.glass` y `.glass-strong` en `src/index.css`).
- **Modo oscuro por defecto:** la etiqueta `<html>` trae `class="dark"` y el fondo base es
  `slate-950`. Tailwind está configurado con `darkMode: 'class'`.
- **Tipografía Inter** cargada desde Google Fonts en `index.html`.
- **Animaciones:** entradas escalonadas de KPIs, hover con elevación, asistente con
  `AnimatePresence` y botones con `whileTap`/`whileHover` de Framer Motion.

---

## ⚙️ Personalización rápida

| ¿Qué quieres cambiar?             | Archivo                              |
| --------------------------------- | ------------------------------------ |
| Moneda (ARS → MXN, EUR…)          | `src/utils/format.ts` → `CURRENCY`   |
| Idioma del formato (es-AR → es-ES)| `src/utils/format.ts` → `LOCALE`     |
| Frases motivacionales             | `src/data/motivationalMessages.ts`   |
| Productos / precios demo          | Edítalos desde la app (vista Productos) o en `src/data/seedData.ts` |
| Colores de acento (violeta/azul)  | `tailwind.config.js` + clases en componentes |
| Nombre del negocio                | `Sidebar.tsx` (logo) + `index.html` (título) |

---

## 🛠️ Solución de problemas

| Problema                             | Solución                                                        |
| ------------------------------------ | --------------------------------------------------------------- |
| El puerto 5173 está ocupado          | `npm run dev -- --port 5174`                                    |
| Error de versión de Node             | Instala Node 20+ desde nodejs.org                               |
| Los cambios no se ven                | Recarga fuerte (`Ctrl+Shift+R`) o reinicia el servidor          |
| Se rompió algo y quieres volver a demo | Borra `electro-crm-v1` de LocalStorage (ver sección Zustand)  |
| `npm install` da advertencias        | Es normal; verifica que `npm run dev` levante sin errores       |

---

## 🗺️ Roadmap

- **Fase 1 (completada ✅):** Dashboard, KPIs, gráficos, registro de venta, asistente y base completa.
- **Fase 2 (completada ✅):** CRUD de productos con búsqueda, filtros y confirmación de eliminación.
- **Fase 3 (completada ✅):** CRUD de ventas avanzado (estados, filtros por fecha, ajuste de stock) y clientes con historial de compras.
- **Fase 4 (completada ✅):** reportes avanzados, exportación a CSV/PDF y respaldo/importación JSON.
- **Rediseño (completado ✅):** presupuestos con estados, ventas desde presupuesto o rápidas, y Dashboard sobre ventas pagadas.
- **PDF (completado ✅):** presupuestos y recibos en PDF con datos de la empresa, folios automáticos, WhatsApp y página de Configuración.
- **Próximos pasos:** metas diarias/mensuales, impuestos configurables por cliente y modo claro.

