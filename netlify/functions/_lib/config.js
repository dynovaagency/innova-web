/**
 * Config compartida entre Netlify Functions.
 *
 * Variables de entorno esperadas (se configuran en el panel de Netlify → Site
 * settings → Environment variables):
 *
 *   MP_ACCESS_TOKEN         → Access Token de MP (producción o sandbox).
 *   MP_MODE                 → "sandbox" | "production" (solo informativo, para logs).
 *   MP_WEBHOOK_SECRET       → secret opcional que MP firma en las notificaciones.
 *   SITE_URL                → https://innovatrabajosocial.com.ar (o el netlify.app en staging).
 *   MOCK_MODE               → "true" cuando no hay tokens todavía. Permite probar el
 *                             flujo entero sin llamar a la API real de MP.
 *
 * IMPORTANTE: nunca hardcodear tokens en el código. Todo va por env vars.
 */

export const MOCK_MODE = process.env.MOCK_MODE === 'true' || !process.env.MP_ACCESS_TOKEN;

export const SITE_URL =
  process.env.SITE_URL ||
  process.env.URL || // Netlify inyecta URL automáticamente en producción
  'http://localhost:8888';

export const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
export const MP_MODE = process.env.MP_MODE || (MP_ACCESS_TOKEN.includes('TEST-') ? 'sandbox' : 'production');

/**
 * URLs de retorno que MP usará después del pago. Las pasamos como back_urls
 * al crear la preferencia. success_url incluye {slug} como parámetro que se
 * completa dinámicamente según el curso comprado.
 */
export const buildBackUrls = (slug, externalReference) => ({
  success: `${SITE_URL}/curso/${slug}?ref=${externalReference}`,
  failure: `${SITE_URL}/pago-fallido?ref=${externalReference}`,
  pending: `${SITE_URL}/pago-pendiente?ref=${externalReference}`,
});

/**
 * Helpers de respuesta con CORS. Como las functions se llaman desde el mismo
 * dominio en producción, CORS no es estrictamente necesario, pero lo dejamos
 * abierto para facilitar testing local con netlify dev en otro puerto.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const ok = (body) => ({
  statusCode: 200,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

export const error = (status, message, extra = {}) => ({
  statusCode: status,
  headers: corsHeaders,
  body: JSON.stringify({ error: message, ...extra }),
});

export const preflight = () => ({
  statusCode: 204,
  headers: corsHeaders,
  body: '',
});
