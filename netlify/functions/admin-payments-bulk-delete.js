/**
 * POST /.netlify/functions/admin-payments-bulk-delete
 *
 * Elimina varios pagos del store en una sola llamada. Acción irreversible.
 *
 * Body:
 *   { refs: string[] }  ← externalReference de los pagos (máximo 100).
 *
 * Autorización:
 *   Cualquier admin o superadmin (requireAdmin), igual que admin-payment-delete.
 *
 * Comportamiento:
 *   - Elimina cualquier pago, sin importar status. La UI advierte cuando
 *     la selección incluye pagos aprobados (ventas reales).
 *   - Cada eliminación se loggea con el admin y un snapshot del pago,
 *     para auditoría (Netlify Function logs).
 *   - Si un pago falla o no existe, sigue con el resto y lo informa.
 *
 * Response:
 *   200 { deleted: string[], notFound: string[], failed: string[] }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';

const MAX_REFS = 100;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const refs = Array.isArray(payload.refs)
    ? [...new Set(payload.refs.filter((r) => typeof r === 'string' && r.trim()))]
    : [];

  if (refs.length === 0) return error(400, 'refs es requerido (lista de externalReference)');
  if (refs.length > MAX_REFS) {
    return error(400, `Se pueden eliminar hasta ${MAX_REFS} pagos por vez`);
  }

  const deleted = [];
  const notFound = [];
  const failed = [];
  const deletedAt = new Date().toISOString();

  for (const ref of refs) {
    try {
      const result = await paymentsRepo.deleteByRef(ref);
      if (!result.deleted) {
        notFound.push(ref);
        continue;
      }
      deleted.push(ref);
      console.log('[admin-payments-bulk-delete] pago eliminado:', {
        ref,
        deletedBy: auth.admin.email,
        deletedAt,
        snapshot: {
          buyerEmail: result.payment.buyerEmail,
          amount: result.payment.amount,
          status: result.payment.status,
          provider: result.payment.provider,
          createdAt: result.payment.createdAt,
        },
      });
    } catch (err) {
      console.error('[admin-payments-bulk-delete] error eliminando', ref, err);
      failed.push(ref);
    }
  }

  return ok({ deleted, notFound, failed });
};