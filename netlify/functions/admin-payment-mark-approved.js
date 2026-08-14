/**
 * POST /.netlify/functions/admin-payment-mark-approved
 *
 * Marca un pago pending como approved. Protegido con requireAdmin.
 *
 * Se usa para pagos manuales (transferencia, Go Cuotas) que no tienen
 * webhook automático. Innova verifica el pago por su cuenta (home banking,
 * notificación de Go Cuotas) y usa este endpoint para confirmarlo.
 *
 * Body: { ref: string }  // externalReference
 *
 * Comportamiento:
 *   - Solo funciona para pagos con status === 'pending'.
 *   - No aplicable a pagos de MercadoPago (que se aprueban vía webhook).
 *   - Dispara el email de acceso automáticamente (mismo helper que mp-webhook).
 *   - Guarda quién lo aprobó y cuándo (approvedBy, approvedAt, approvedMethod).
 *   - Idempotente: reintentos no gatillan emails duplicados.
 *
 * Response:
 *   200 { approved: true, emailSent: boolean, emailId? }
 *   400 { error: 'Pago no pendiente' | 'Pago ya aprobado' | 'Método no aplicable' }
 *   404 { error: 'Pago no encontrado' }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import { sendAccessEmail } from './_lib/email.js';
import { resolveProductTitle } from './_lib/products/title-resolver.js';

const MANUAL_METHODS = ['transferencia', 'gocuotas'];

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

    if (payment.status === 'approved') {
      return error(400, 'El pago ya está aprobado', { currentStatus: 'approved' });
    }

    if (payment.status !== 'pending') {
      return error(400, `Solo se pueden aprobar pagos pendientes (estado actual: ${payment.status})`, {
        currentStatus: payment.status,
      });
    }

    // Solo aceptamos aprobación manual para pagos por transferencia/gocuotas.
    // Los pagos de MP se aprueban automáticamente vía webhook.
    if (!MANUAL_METHODS.includes(payment.provider)) {
      return error(400, `Este endpoint solo aplica a pagos por transferencia o Go Cuotas. Provider del pago: ${payment.provider}`, {
        currentProvider: payment.provider,
      });
    }

    if (!payment.buyerEmail) {
      return error(400, 'El pago no tiene email asociado, no se puede enviar el acceso');
    }

    const now = new Date().toISOString();

    // 1. Marcar el pago como aprobado
    await paymentsRepo.updateStatus(ref, {
      status: 'approved',
      approvedAt: now,
      approvedBy: auth.admin.email,
      approvedMethod: 'manual',
    });

    console.log(
      `[admin-payment-mark-approved] pago aprobado manualmente: ${ref}`,
      { admin: auth.admin.email, provider: payment.provider }
    );

    // 2. Enviar email de acceso (idempotente: solo si no se envió antes)
    let emailResult = { sent: false };
    if (!payment.emailSentAt) {
      const cursoTitle = await resolveProductTitle(payment);
      emailResult = await sendAccessEmail({
        to: payment.buyerEmail,
        cursoTitle,
        cursoSlug: payment.cursoSlug,
        externalReference: ref,
      });

      if (emailResult.sent) {
        await paymentsRepo.updateStatus(ref, {
          emailSentAt: new Date().toISOString(),
          emailId: emailResult.id || null,
        });
        console.log(`[admin-payment-mark-approved] email enviado: ${ref}`);
      } else {
        console.warn(
          `[admin-payment-mark-approved] email no enviado: ${ref}`,
          emailResult.error
        );
      }
    } else {
      console.log(`[admin-payment-mark-approved] email ya se había enviado previamente: ${ref}`);
    }

    return ok({
      approved: true,
      emailSent: emailResult.sent,
      emailId: emailResult.id || null,
      to: payment.buyerEmail,
    });
  } catch (err) {
    console.error('[admin-payment-mark-approved] error:', err);
    return error(500, 'No se pudo aprobar el pago', {
      details: err.message,
    });
  }
};