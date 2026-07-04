# Backend de pagos — Innova Trabajo Social

Implementación mínima de Checkout Pro de Mercado Pago + verificación de acceso
al curso post-pago. Corre 100% en Netlify (Functions + Blobs, sin infra externa).

## Flujo completo

```
Usuario en /servicios/capsula-formativa
         │
         │ click "Inscribite ahora"
         ▼
PaymentModal → POST /.netlify/functions/create-preference
         │                            │
         │                            ▼
         │                    Crea preferencia en MP
         │                    Guarda pago (status=pending) en Blobs
         │                            │
         │                            ▼
         │                    Devuelve { initPoint, externalReference }
         ▼
Redirect a initPoint (Checkout Pro de MP)
         │
         │ Usuario paga
         ▼
MP procesa el pago
         │
         ├─── (async) POST /.netlify/functions/mp-webhook
         │              │
         │              ▼
         │      Consulta el pago en la API de MP
         │      Actualiza status en Blobs (approved/rejected/pending)
         │
         │ (sync) Redirect al back_url según status:
         │    approved → /curso/:slug?ref=xxx
         │    pending  → /pago-pendiente?ref=xxx
         │    failure  → /pago-fallido?ref=xxx
         ▼
/curso/:slug carga → GET /.netlify/functions/verify-payment?ref=xxx&slug=xxx
         │
         │ valid: true
         ▼
Renderiza iframe de Genially
```

## Funciones

### `create-preference.js`
- **Método:** POST
- **Body:** `{ cursoSlug, buyerEmail? }`
- **Responde:** `{ preferenceId, initPoint, externalReference }`
- **Efecto:** crea preferencia en MP, guarda registro pending en Blobs.

### `mp-webhook.js`
- **Método:** POST (MP la llama automáticamente)
- **Body:** `{ type: "payment", data: { id: "..." } }`
- **Responde:** siempre 200 (evita reintentos de MP).
- **Efecto:** consulta detalle del pago en MP, actualiza status en Blobs.

### `verify-payment.js`
- **Método:** GET
- **Query:** `?ref=xxx&slug=xxx`
- **Responde:** `{ valid: true|false, reason?, cursoSlug?, status? }`
- **Efecto:** ninguno (solo lectura).

### `mock-approve.js` (solo modo mock)
- **Método:** POST
- **Query:** `?ref=xxx`
- **Efecto:** aprueba manualmente un pago pending. Solo usable en modo mock.

## Variables de entorno

Configurar en el panel de Netlify → Site settings → Environment variables:

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `MP_ACCESS_TOKEN` | Sí (real) | Access Token de MP. En sandbox empieza con `TEST-`. En producción con `APP_USR-`. |
| `MP_MODE` | No | `sandbox` o `production`. Solo informativo (para logs). |
| `SITE_URL` | Sí | URL base del sitio. Netlify inyecta `URL` automáticamente en prod, usar esa como fallback. |
| `MOCK_MODE` | No | `"true"` para forzar modo mock. Default: activo si no hay `MP_ACCESS_TOKEN`. |

## Pasos para pasar de mock a producción

1. **Obtener credenciales de MP.** Innova entra a mercadopago.com.ar → Tu perfil → Credenciales.
   - Copiar el "Access Token" de **producción** (empieza con `APP_USR-`).
   - Copiar el de **prueba/sandbox** (empieza con `TEST-`) para testing.

2. **Cargar variables en Netlify (staging con sandbox primero).**
   - Site settings → Environment variables → Add variable:
     - `MP_ACCESS_TOKEN` = el `TEST-...` de sandbox
     - `MOCK_MODE` = `false`
   - Redeploy manual del sitio para que las funciones tomen las nuevas envs.

3. **Testear el flujo end-to-end.**
   - Ir a `/servicios/capsula-formativa`, hacer click en "Inscribite ahora".
   - Pagar con una **tarjeta de test** de MP (docs.mercadopago.com/testing).
   - Verificar que redirige a `/curso/vulnerabilidad-social?ref=...` y carga el Genially.
   - Verificar que el webhook llegó (Netlify → Functions → mp-webhook → Logs).

4. **Configurar la URL del webhook en el panel de MP.**
   - MP Panel → Developers → Webhooks → Configurar URLs.
   - Agregar: `https://<tu-sitio>.netlify.app/.netlify/functions/mp-webhook`
   - Eventos: solo `payment`.

5. **Pasar a producción.**
   - Cambiar `MP_ACCESS_TOKEN` al de producción (`APP_USR-...`).
   - Verificar `SITE_URL` apunta al dominio final.
   - Hacer una prueba de pago real con un monto chico (ej. cambiar temporalmente
     el precio a $100 en `_lib/config.js`, probar, y volver a $28.000).

## Storage (Netlify Blobs)

- Los pagos se guardan en el store `innova-payments`.
- Cada registro se indexa por `externalReference`.
- Netlify Blobs es gratis hasta cierto volumen — el uso esperado (unos pagos por día) queda muy por debajo del límite.
- Para debug: los logs de cada función están en Netlify → Functions → [nombre] → Logs.

## Notas de seguridad (MVP)

- El único control de acceso al curso es "¿existe un pago aprobado con este ref?".
- Un usuario que comparta su URL de curso (con el ref) permite entrar a quien la reciba.
- Esto se resuelve en Fase 2 con auth por usuario + sesiones server-side.
- Mientras tanto, el link tiene `?ref=<token largo aleatorio>` que no es adivinable.

## Cómo agregar una cápsula nueva

1. Actualizar `src/data/cursos.js` con el nuevo objeto (slug, title, subtitle, geniallyUrl).
2. Actualizar `CATALOGO` en `netlify/functions/create-preference.js` con el nuevo slug y su precio.
3. (Ese doble mantenimiento se elimina en Fase 2 cuando pase todo a DB.)
