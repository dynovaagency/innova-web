/**
 * POST /.netlify/functions/admin-payment-delete
 *
 * Elimina un pago del store. Acción irreversible.
 *
 * Body:
 *   { ref: string }  ← externalReference del pago a eliminar.
 *
 * Autorización:
 *   Solo superadmins (role === 'superadmin'). Los admins normales no
 *   pueden eliminar pagos.
 *
 * Comportamiento:
 *   - Elimina cualquier pago, sin importar status. La UI debe advertir
 *     al usuario cuando el pago esté aprobado (representa una venta real).
 *   - Loggea la eliminación con el admin que la hizo y los datos del
 *     pago borrado para auditoría (aparece en Netlify Function logs).
 *   - No es idempotente: si el ref no existe, devuelve 404.
 *
 * Response:
 *   200 { deleted: true, ref: string }
 *   401 si no hay sesión válida
 *   403 si el admin no es superadmin
 *   404 si el pago no existe
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  // Restricción: solo superadmins pueden eliminar pagos.
  if (auth.admin.role !== 'superadmin') {
    return error(403, 'Solo los superadmins pueden eliminar pagos', {
      currentRole: auth.admin.role,
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { ref } = payload;
  if (!ref || typeof ref !== 'string') {
    return error(400, 'ref (externalReference) es requerido');
  }

  try {
    const result = await paymentsRepo.deleteByRef(ref);

    if (!result.deleted) {
      return error(404, 'Pago no encontrado', { ref });
    }

    // Log de auditoría: quién borró qué y cuándo.
    console.log('[admin-payment-delete] pago eliminado:', {
      ref,
      deletedBy: auth.admin.email,
      deletedAt: new Date().toISOString(),
      snapshot: {
        buyerEmail: result.payment.buyerEmail,
        amount: result.payment.amount,
        status: result.payment.status,
        provider: result.payment.provider,
        createdAt: result.payment.createdAt,
      },
    });

    return ok({
      deleted: true,
      ref,
    });
  } catch (err) {
    console.error('[admin-payment-delete] error:', err);
    return error(500, 'No se pudo eliminar el pago', {
      details: err.message,
    });
  }
};