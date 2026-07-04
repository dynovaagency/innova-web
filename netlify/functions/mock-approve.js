/**
 * POST /.netlify/functions/mock-approve?ref=inv_abc123
 *
 * SOLO DISPONIBLE EN MOCK_MODE. Simula que MP aprobó el pago del ref indicado
 * y actualiza el store. Usado por la página /mock-checkout para poder probar
 * el flujo completo sin credenciales reales.
 *
 * IMPORTANTE: en producción esta función no hace nada. Podríamos borrarla,
 * pero la dejamos deployada por si hay que debuggear con un env var temporal.
 */

import { MOCK_MODE, ok, error, preflight } from './_lib/config.js';
import { updatePaymentStatus } from './_lib/store.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  if (!MOCK_MODE) {
    return error(403, 'mock-approve solo funciona en MOCK_MODE');
  }

  const ref = event.queryStringParameters?.ref;
  if (!ref) return error(400, 'ref requerido');

  const updated = await updatePaymentStatus(ref, {
    status: 'approved',
    mpPaymentId: `mock_pay_${Date.now()}`,
    approvedAt: new Date().toISOString(),
  });

  if (!updated) return error(404, 'ref no encontrado');

  console.log('[MOCK] pago aprobado:', ref);
  return ok({ approved: true, externalReference: ref, cursoSlug: updated.cursoSlug });
};
