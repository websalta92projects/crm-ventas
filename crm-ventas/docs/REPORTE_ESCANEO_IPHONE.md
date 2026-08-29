# Reporte: Auditoría del escaneo de código de barras en iPhone (iOS/Safari)

**Fecha:** 2026-08-29
**Proyecto:** ElectroCRM
**Archivos modificados:**
- `src/components/ui/BarcodeScannerModal.tsx` (componente de escaneo usado por presupuestos y ventas)
- `src/components/budgets/BudgetFormModal.tsx`
- `src/components/sales/SaleFormModal.tsx`
- `package.json` / `package-lock.json` (dependencia `@zxing/library`)

---

## 1. Diagnóstico (logs agregados)

Se agregaron `console.log` con prefijo **📷** en cada paso del ciclo de vida de la cámara
(visibles en la consola del navegador → Safari → Develop → JS Console, o Chrome DevTools):

| Paso | Log |
|---|---|
| Apertura del escáner | `📷 Iniciando cámara... (html5-qrcode)` / `📷 Iniciando cámara... (@zxing/library)` |
| Cámara lista | `📷 Cámara iniciada correctamente (html5-qrcode)` / `(@zxing)` |
| Código leído | `📷 Código detectado: <código>` |
| Error | `📷 Error al iniciar la cámara (html5-qrcode): <error>` |
| Sin detección | `📷 Sin detección en 15s → deteniendo cámara` |
| Llegada al carrito | `📷 Código recibido en presupuesto/venta: <código>` |

Esto permite **diagnosticar** si: la cámara no se inicia (no aparece "Cámara iniciada"),
o se inicia pero no detecta (aparece "iniciada" pero nunca "Código detectado").

## 2. Validación de permisos

- html5-qrcode llama a `getUserMedia({ video: { facingMode: 'environment' } })`, lo que
  dispara el aviso de permiso del navegador **en el primer clic** (por eso se abre el modal
  desde un botón, dentro de un gesto de usuario).
- Si el permiso es **denegado** (`NotAllowedError` / `PermissionDeniedError` / `SecurityError`),
  se muestra el mensaje:
  > ⚠️ Permiso de cámara denegado. Actívalo en Configuración → Safari → Cámara → Permitir.
- Requisito iOS: la app debe servirse por **HTTPS** (Vercel lo hace automáticamente).

## 3. Configuración de html5-qrcode (optimizada para iOS)

```ts
new Html5Qrcode('barcode-scanner-region', {
  verbose: false,
  useBarCodeDetectorIfSupported: true,
  formatsToSupport: [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.CODE_128,
  ],
})
await scanner.start(
  { facingMode: 'environment' },
  { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
  successCallback,
  errorCallback,
)
```

- **fps: 10** · **qrbox 250×250** (área de escaneo cuadrada) · **aspectRatio: 1.0**.
- html5-qrcode setea `playsInline` en el `<video>` internamente (requisito de iOS).
- Incluye **CODE_128** además de QR/EAN-13/UPC-A.

## 4. Timeout con manejo de error (15 segundos)

- Cuando la cámara está activa y **no detecta nada en 15 s**:
  1. Se detiene la cámara (`html5qrcode.stop()` / `zxing.reset()`).
  2. Se muestra el toast:
     > ⚠️ No se detectó ningún código. Intenta enfocar mejor, usa el lector USB o ingresa el código manualmente.
  3. El campo de ingreso manual queda visible.

## 5. Fallback manual (siempre disponible)

- En el modal de presupuesto/venta, junto al botón **📷 Escanear** ahora hay un botón **⌨️ Manual**
  que abre el escáner directo al campo de ingreso de código.
- Dentro del modal, el botón **⌨️ Ingresar código manual** **siempre** está visible.
- Al escribir el código y pulsar **Enter / Añadir** se busca el producto por `barcode` y se
  agrega al carrito (misma lógica que el escaneo con cámara).

## 6. Cierre correcto de la cámara

- El `useEffect` tiene un **cleanup** que ejecuta `stopAll()` al desmontar el componente:
  `html5qrcode.stop()` + `clear()`, y `zxing.reset()`.
- Si el usuario cierra el modal con la cámara activa, esta se detiene (la luz del indicador
  de cámara se apaga) y no quedan streams colgados.

## 7. Pruebas y resultados

> ⚠️ **No se pudo probar en un iPhone físico en este entorno** (no hay dispositivo disponible).
> La lógica se validó con build de producción y revisión del flujo. **Plan de prueba manual**:

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | iPhone Safari, botón 📷 Escanear, conceder permiso | "📷 Cámara iniciada correctamente" en consola |
| 2 | Enfocar un EAN-13 / QR | "📷 Código detectado" + producto en carrito |
| 3 | Denegar permiso | Mensaje "⚠️ Permiso de cámara denegado…" |
| 4 | No enfocar nada 15 s | Toast "⚠️ No se detectó ningún código…" + campo manual |
| 5 | Botón ⌨️ Manual, escribir código + Enter | Producto agregado al carrito |
| 6 | Cerrar modal con cámara activa | Cámara se detiene (sin stream colgado) |
| 7 | Android Chrome, mismo flujo | Igual que iPhone (Android no requiere HTTPS para localhost) |

### Resultados reales en este entorno
- ✅ `tsc --noEmit && vite build` (build de producción correcto).
- ✅ Dev server sirve el módulo del escáner sin errores.
- ✅ `@zxing/library` incluido en el bundle (chunks separados).
- ⏳ Prueba en hardware real: **pendiente** (iPhone Safari y Android Chrome).

## 8. Respaldo: @zxing/library

- Instalado `@zxing/library` (motor usado internamente por html5-qrcode, con control directo
  del `<video playsInline>`).
- Si **html5-qrcode falla al iniciar**, se intenta automáticamente `BrowserMultiFormatReader`
  de @zxing con la cámara trasera y los formatos QR/EAN-13/UPC-A.
- Si ambos fallan → mensaje de error + ingreso manual (siempre disponible).

## Conclusión

El escaneo quedó con **triple vía**: cámara (html5-qrcode) → cámara (@zxing) → **ingreso manual**.
Con el diagnóstico por consola se puede identificar exactamente en qué paso falla en cada
dispositivo y confirmar el arreglo en un iPhone real.
