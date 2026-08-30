# Reporte: Escaneo de código de barras con BarcodeDetector API (iPhone/iOS)

**Fecha:** 2026-08-29
**Proyecto:** InvoiceDomatic
**Archivo principal:** `src/components/ui/BarcodeScannerModal.tsx` (usado por presupuestos y ventas)

---

## Estrategia implementada: 3 capas en orden de prioridad

### Capa 1 — BarcodeDetector API (nativa)
- Acceso a cámara con `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`.
- `new BarcodeDetector({ formats: ['qr_code','ean_13','ean_8','upc_a','upc_e','code_128'] })`.
- Bucle con `requestAnimationFrame` que llama `detect(video)` y devuelve el primer código.
- Se usa **si `'BarcodeDetector' in window`** (Chrome, Edge, Android, Firefox 133+).
- Nota: en iPhone/Safari actual BarcodeDetector no está disponible → cae a la Capa 2 (comportamiento previsto y cubierto).

### Capa 2 — ZXing (fallback)
- `@zxing/library` → `BrowserMultiFormatReader` sobre el MISMO `<video>`.
- `reader.decodeFromVideoDevice(null, video, cb)` → cámara trasera.
- Se activa cuando BarcodeDetector no existe o falla al iniciar.

### Capa 3 — Ingreso manual (fallback final)
- Botón **⌨️ Ingresar código manual** SIEMPRE visible dentro del modal.
- Botón **⌨️ Manual** junto a **📷 Escanear** en presupuesto/venta (abre el modal con el input listo).
- Al escribir y pulsar Enter/Añadir se busca el producto por `barcode` y se agrega al carrito.

## Configuración del <video>

```tsx
<video
  ref={videoRef}
  playsInline   // requerido en iOS (no abre pantalla completa)
  autoPlay
  muted
  style={{ width: '100%', height: 'auto', maxHeight: '400px' }}
/>
```

## Logs de diagnóstico (prefijo 📷)

| Momento | Log |
|---|---|
| BarcodeDetector disponible | `📷 Intentando BarcodeDetector...` |
| BarcodeDetector iniciado | `📷 BarcodeDetector activo` |
| BarcodeDetector no disponible | `📷 BarcodeDetector NO disponible → usando ZXing` |
| Capa ZXing | `📷 Intentando ZXing...` / `📷 ZXing activo` |
| Código leído | `📷 Código detectado: X` |
| Error en detector | `📷 BarcodeDetector error: ...` |
| Error general | `📷 Error al iniciar ... : ...` |
| Sin detección | `📷 Sin detección en 15s → deteniendo escáner` |
| Ingreso manual | `📷 Código manual: X` |

## Manejo de errores

- **Permisos denegados** (`NotAllowedError` / `PermissionDeniedError` / `SecurityError`):
  > ⚠️ Permiso de cámara denegado. Actívalo en Configuración → Safari → Cámara → Permitir.
- **Sin detección en 15 s**: se detiene el escáner (tracks + reader) y se muestra:
  > ⚠️ No se detectó ningún código. Ingresa el código manualmente.
- Cámara no disponible: mensaje genérico + campo manual.

## Cierre correcto de la cámara

- `stopScanner()` detiene: el `requestAnimationFrame`, el detector, **`reader.reset()`** (ZXing) y
  **`stream.getTracks().forEach(t => t.stop())`** (getUserMedia) y limpia `video.srcObject`.
- Se ejecuta en el **cleanup del `useEffect`** → al cerrar el modal o desmontar, la cámara se apaga.

## Pruebas

> ⚠️ No hay iPhone físico disponible en este entorno; se validó build y lógica. Plan de prueba:

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | iPhone Safari, 📷 Escanear, conceder permiso | `📷 BarcodeDetector NO disponible → usando ZXing` + `📷 ZXing activo` |
| 2 | Enfocar EAN-13 / QR | `📷 Código detectado: X` + producto al carrito |
| 3 | Denegar permiso | Mensaje ⚠️ Permiso de cámara denegado… |
| 4 | No detectar en 15 s | Toast ⚠️ No se detectó… + campo manual |
| 5 | ⌨️ Manual + Enter | Producto agregado al carrito |
| 6 | Cerrar modal con cámara activa | Cámara se apaga (tracks detenidos) |
| 7 | Android Chrome | `📷 Intentando BarcodeDetector...` → `📷 BarcodeDetector activo` |
| 8 | Chrome antiguo / Firefox < 133 | Cae a ZXing |

**En este entorno:** ✅ `tsc --noEmit && vite build` · ✅ dev server 200 · ✅ `@zxing/library` en bundle.

## Conclusión

El escaneo usa ahora la estrategia correcta: **BarcodeDetector (rápida) → ZXing (compatible) → manual (siempre)**.
Los logs 📷 permiten identificar exactamente en qué capa falla cada dispositivo.