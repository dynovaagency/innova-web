/**
 * POST /.netlify/functions/mock-approve?ref=inv_abc123
 *
 * SOLO DISPONIBLE EN MOCK_MODE. Simula que MP aprobó el pago del ref indicado.
 *
 * Refactor bugfix: consume paymentsRepo en vez de store.js viejo.
 */

import { MOCK_MODE, ok, error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  if (!MOCK_MODE) {
    return error(403, 'mock-approve solo funciona en MOCK_MODE');
  }

  const ref = event.queryStringParameters?.ref;
  if (!ref) return error(400, 'ref requerido');

  const existing = await paymentsRepo.findByReference(ref);
  if (!existing) return error(404, 'ref no encontrado');

  const updated = await paymentsRepo.updateStatus(ref, {
    status: 'approved',
    mpPaymentId: `mock_pay_${Date.now()}`,
    approvedAt: new Date().toISOString(),
  });

  console.log('[MOCK] pago aprobado:', ref);
  return ok({ approved: true, externalReference: ref, cursoSlug: updated.cursoSlug });
};