/**
 * GET /.netlify/functions/admin-payment-get?ref=inv_...
 *
 * Devuelve el detalle completo de un pago por externalReference.
 * Protegido con requireAdmin. A diferencia del list, incluye providerMetadata.
 *
 * Response:
 *   200 { payment }
 *   404 { error: 'Pago no encontrado' }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  const ref = event.queryStringParameters?.ref;
  if (!ref) {
    return error(400, 'ref es requerido');
  }

  try {
    const payment = await paymentsRepo.findByReference(ref);
    if (!payment) {
      return error(404, 'Pago no encontrado', { ref });
    }
    return ok({ payment });
  } catch (err) {
    console.error('[admin-payment-get] error:', err);
    return error(500, 'No se pudo obtener el pago', {
      details: err.message,
    });
  }
};