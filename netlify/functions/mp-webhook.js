/**
 * POST /.netlify/functions/mp-webhook
 *
 * Notificación asíncrona de MercadoPago cuando cambia el estado de un pago.
 * Ver docs completos en la versión Entrega 3/4.
 *
 * Refactor bugfix: consume paymentsRepo en vez de store.js viejo.
 */

import { MOCK_MODE, ok, error, preflight } from './_lib/config.js';
import { sendAccessEmail } from './_lib/email.js';
import { getProvider } from './_lib/providers/payment/index.js';
import { PAYMENT_STATUS } from './_lib/providers/payment/interface.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import { resolveProductTitle } from './_lib/products/title-resolver.js';

const persistedStatusFor = (providerStatus) => {
  if (providerStatus === PAYMENT_STATUS.APPROVED) return 'approved';
  if (providerStatus === PAYMENT_STATUS.PENDING) return 'pending';
  return 'rejected';
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return error(405, 'Method not allowed');
  }

  const provider = getProvider('mercadopago');

  const webhookInfo = provider.parseWebhook({
    body: event.body,
    queryStringParameters: event.queryStringParameters,
    headers: event.headers,
  });

  console.log('[webhook] recibido:', webhookInfo);

  if (!webhookInfo) {
    return ok({ ignored: true, reason: 'not a payment event' });
  }

  if (MOCK_MODE) {
    console.log('[MOCK] webhook ignorado en modo mock');
    return ok({ mock: true, ignored: true });
  }

  try {
    const payment = await provider.verifyPayment(webhookInfo.paymentId);
    const { externalReference, status, metadata } = payment;

    if (!externalReference) {
      console.warn('[webhook] pago sin external_reference:', webhookInfo.paymentId);
      return ok({ processed: false, reason: 'no external_reference' });
    }

    const existing = await paymentsRepo.findByReference(externalReference);
    if (!existing) {
      console.warn('[webhook] no encontramos el pago en el store:', externalReference);
      return ok({ processed: false, reason: 'unknown external_reference' });
    }

    const mappedStatus = persistedStatusFor(status);

    await paymentsRepo.updateStatus(externalReference, {
      status: mappedStatus,
      mpPaymentId: metadata?.mpPaymentId || null,
      mpStatus: metadata?.mpStatus || null,
      mpStatusDetail: metadata?.mpStatusDetail || null,
      approvedAt:
        mappedStatus === 'approved'
          ? metadata?.approvedAt || new Date().toISOString()
          : null,
    });

    console.log('[webhook] pago actualizado:', { externalReference, status: mappedStatus });

    if (
      mappedStatus === 'approved' &&
      existing.buyerEmail &&
      !existing.emailSentAt &&
      existing.status !== 'approved'
    ) {
      const cursoTitle = await resolveProductTitle(existing);
      const result = await sendAccessEmail({
        to: existing.buyerEmail,
        cursoTitle,
        cursoSlug: existing.cursoSlug,
        externalReference,
      });

      if (result.sent) {
        await paymentsRepo.updateStatus(externalReference, {
          emailSentAt: new Date().toISOString(),
          emailId: result.id || null,
        });
      } else {
        console.warn('[webhook] mail no enviado:', result.error);
      }
    }

    return ok({ processed: true, externalReference, status: mappedStatus });
  } catch (err) {
    console.error('[webhook] error:', err);
    return ok({ processed: false, error: err.message });
  }
};