/**
 * POST /.netlify/functions/admin-payment-resend-email
 *
 * Reenvía el email de acceso a un pago approved. Protegido con requireAdmin.
 *
 * Body: { ref: string }  // externalReference
 *
 * Comportamiento:
 *   - Solo funciona para pagos con status === 'approved' y buyerEmail seteado.
 *   - Marca resentEmailAt / resentEmailBy en el pago (para auditar reenvíos).
 *   - No modifica emailSentAt (que quedó del primer envío automático).
 *
 * Response:
 *   200 { sent: true, emailId }
 *   400 { error: 'El pago no está aprobado' | 'El pago no tiene email' }
 *   404 { error: 'Pago no encontrado' }
 *   500 { error: 'No se pudo enviar el email' }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import { sendAccessEmail } from './_lib/email.js';
import { resolveProductTitle } from './_lib/products/title-resolver.js';

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

  const ref = payload.ref;
  if (!ref) return error(400, 'ref es requerido');

  try {
    const payment = await paymentsRepo.findByReference(ref);
    if (!payment) {
      return error(404, 'Pago no encontrado', { ref });
    }

    if (payment.status !== 'approved') {
      return error(400, 'El pago no está aprobado, no se puede reenviar el acceso', {
        currentStatus: payment.status,
      });
    }

    if (!payment.buyerEmail) {
      return error(400, 'El pago no tiene email asociado', { ref });
    }

    // Resolver el título (snapshot > catálogo > slug)
    const cursoTitle = await resolveProductTitle(payment);

    // Enviar el email
    const result = await sendAccessEmail({
      to: payment.buyerEmail,
      cursoTitle,
      cursoSlug: payment.cursoSlug,
      externalReference: payment.externalReference,
    });

    if (!result.sent) {
      console.error(
        `[admin-payment-resend-email] envío falló: ${ref}`,
        result.error
      );
      return error(500, 'No se pudo enviar el email', {
        details: result.error,
      });
    }

    // Auditar el reenvío en el pago
    await paymentsRepo.updateStatus(ref, {
      resentEmailAt: new Date().toISOString(),
      resentEmailBy: auth.admin.email,
      resentEmailId: result.id,
    });

    console.log(
      `[admin-payment-resend-email] reenviado: ${ref}`,
      { to: payment.buyerEmail, admin: auth.admin.email }
    );

    return ok({
      sent: true,
      emailId: result.id,
      to: payment.buyerEmail,
    });
  } catch (err) {
    console.error('[admin-payment-resend-email] error:', err);
    return error(500, 'No se pudo reenviar el email', {
      details: err.message,
    });
  }
};