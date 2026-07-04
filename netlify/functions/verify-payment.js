/**
 * GET /.netlify/functions/verify-payment?ref=inv_abc123
 *
 * La página /curso/:slug llama a este endpoint con el ?ref que MP puso en la
 * URL después del pago. Devolvemos si el pago está aprobado y a qué curso da
 * acceso.
 *
 * Respuestas:
 *   200 { valid: true, cursoSlug: "vulnerabilidad-social", status: "approved" }
 *   200 { valid: false, reason: "pending" | "rejected" | "not_found" | "wrong_curso" }
 *
 * SIEMPRE devolvemos 200 (no 404/403) para que el frontend pueda mostrar un
 * mensaje amigable en vez de un error genérico del navegador.
 */

import { MOCK_MODE, ok, error, preflight } from './_lib/config.js';
import { getPayment } from './_lib/store.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const ref = event.queryStringParameters?.ref;
  const expectedSlug = event.queryStringParameters?.slug;

  if (!ref) {
    return ok({ valid: false, reason: 'missing_ref' });
  }

  // --- MODO MOCK ---------------------------------------------------
  // No hay persistencia en mock. Cualquier ref con el prefijo esperado se
  // acepta. La página del curso confía en el slug del path para saber qué
  // cápsula mostrar.
  if (MOCK_MODE) {
    if (!ref.startsWith('inv_')) {
      return ok({ valid: false, reason: 'not_found' });
    }
    return ok({
      valid: true,
      cursoSlug: expectedSlug || 'vulnerabilidad-social',
      status: 'approved',
      approvedAt: new Date().toISOString(),
      mock: true,
    });
  }

  // --- MODO REAL (con Blobs) ---------------------------------------
  const payment = await getPayment(ref);
  if (!payment) {
    return ok({ valid: false, reason: 'not_found' });
  }

  // Si el pago está pending o rejected, no dar acceso.
  if (payment.status !== 'approved') {
    return ok({
      valid: false,
      reason: payment.status, // "pending" | "rejected"
      cursoSlug: payment.cursoSlug,
    });
  }

  // Si nos pasan el slug esperado y no coincide con el del pago, tampoco
  // damos acceso (evita que un pago de otra cápsula abra ésta).
  if (expectedSlug && payment.cursoSlug !== expectedSlug) {
    return ok({
      valid: false,
      reason: 'wrong_curso',
      cursoSlug: payment.cursoSlug,
    });
  }

  return ok({
    valid: true,
    cursoSlug: payment.cursoSlug,
    status: payment.status,
    approvedAt: payment.approvedAt,
  });
};
