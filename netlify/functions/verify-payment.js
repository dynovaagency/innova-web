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
 *
 * Refactor bugfix: consume paymentsRepo en vez de store.js viejo.
 */

import { MOCK_MODE, ok, error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const ref = event.queryStringParameters?.ref;
  const expectedSlug = event.queryStringParameters?.slug;

  if (!ref) {
    return ok({ valid: false, reason: 'missing_ref' });
  }

  // --- MODO MOCK ---------------------------------------------------
  // Con el refactor a paymentsRepo, ahora sí podemos consultar el store en
  // mock también (los datos existen porque mock-approve los guarda ahí).
  // Pero mantenemos un fallback permisivo por si alguien probó el flujo
  // antes de que estos cambios llegaran a develop y no tiene pagos guardados.
  if (MOCK_MODE) {
    const payment = await paymentsRepo.findByReference(ref);
    if (payment && payment.status === 'approved') {
      return ok({
        valid: true,
        cursoSlug: payment.cursoSlug,
        status: 'approved',
        approvedAt: payment.approvedAt,
        mock: true,
      });
    }
    // Fallback permisivo: si el ref tiene formato válido, aceptamos igual.
    // Facilita testing manual sin necesidad de pasar por el flujo completo.
    if (ref.startsWith('inv_')) {
      return ok({
        valid: true,
        cursoSlug: expectedSlug || 'vulnerabilidad-social',
        status: 'approved',
        approvedAt: new Date().toISOString(),
        mock: true,
        note: 'permissive_fallback',
      });
    }
    return ok({ valid: false, reason: 'not_found' });
  }

  // --- MODO REAL ---------------------------------------------------
  const payment = await paymentsRepo.findByReference(ref);
  if (!payment) {
    return ok({ valid: false, reason: 'not_found' });
  }

  if (payment.status !== 'approved') {
    return ok({
      valid: false,
      reason: payment.status,
      cursoSlug: payment.cursoSlug,
    });
  }

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