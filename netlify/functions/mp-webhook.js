/**
 * POST /.netlify/functions/mp-webhook
 *
 * Notificación asíncrona de MercadoPago cuando cambia el estado de un pago.
 * MP envía un POST con: { type: "payment", data: { id: "12345" } }.
 *
 * Nuestro trabajo:
 *   1. Parsear el webhook (delegado al provider).
 *   2. Consultar los detalles del pago (delegado al provider).
 *   3. Actualizar el registro en el store.
 *   4. Disparar el mail de acceso si corresponde (con idempotencia).
 *
 * MP reintenta la notificación si respondemos con error. Devolvemos 200
 * siempre que hayamos procesado (incluso si el evento no es relevante).
 *
 * Refactor de Entrega 3: la lógica de MP se movió al provider.
 * Este handler ahora es agnóstico de provider — cuando en Etapa 3 aparezca
 * PayPal, se puede clonar este file como paypal-webhook.js y solo cambia
 * `getProvider('mercadopago')` por `getProvider('paypal')`.
 * La lógica de idempotencia, actualización de estado y mail queda idéntica.
 */

import { MOCK_MODE, ok, error, preflight } from './_lib/config.js';
import { updatePaymentStatus, getPayment } from './_lib/store.js';
import { sendAccessEmail } from './_lib/email.js';
import { getProvider } from './_lib/providers/payment/index.js';
import { PAYMENT_STATUS } from './_lib/providers/payment/interface.js';

// Espejo del catálogo, solo con títulos. Se elimina en Entrega 4 cuando
// pasemos a leer del blob via productsRepo.findBySlug().
const CATALOGO_TITLES = {
  'vulnerabilidad-social':
    'Vulnerabilidad Social y Acumulación de Desventajas en las Trayectorias de Vida',
};

/**
 * Traduce nuestro estado interno (del provider) al estado que persistimos
 * en el store. El store solo distingue tres estados en la práctica:
 * 'approved', 'pending', 'rejected'. Los 'cancelled' y 'unknown' se
 * consolidan en 'rejected' para no gatillar accesos ni mails.
 */
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

  // Parseamos el webhook a través del provider. Encapsula las distintas formas
  // en que MP puede entregar el payload (body JSON, query string, action.split).
  const webhookInfo = provider.parseWebhook({
    body: event.body,
    queryStringParameters: event.queryStringParameters,
    headers: event.headers,
  });

  console.log('[webhook] recibido:', webhookInfo);

  // Si no es un evento de payment relevante, respondemos 200 para que MP
  // no reintente. Los merchant_order y otros los ignoramos.
  if (!webhookInfo) {
    return ok({ ignored: true, reason: 'not a payment event' });
  }

  // --- MODO MOCK ---------------------------------------------------
  // En mock, el mock-checkout ya actualizó el status directamente vía
  // mock-approve.js. Este endpoint queda como no-op.
  if (MOCK_MODE) {
    console.log('[MOCK] webhook ignorado en modo mock');
    return ok({ mock: true, ignored: true });
  }

  // --- MODO REAL ---------------------------------------------------
  try {
    // Consultamos los detalles del pago vía el provider. Es la fuente de
    // verdad — nunca confiamos en el body del webhook para actualizar estado.
    const payment = await provider.verifyPayment(webhookInfo.paymentId);
    const { externalReference, status, metadata } = payment;

    if (!externalReference) {
      console.warn('[webhook] pago sin external_reference:', webhookInfo.paymentId);
      return ok({ processed: false, reason: 'no external_reference' });
    }

    const existing = await getPayment(externalReference);
    if (!existing) {
      console.warn('[webhook] no encontramos el pago en el store:', externalReference);
      return ok({ processed: false, reason: 'unknown external_reference' });
    }

    const mappedStatus = persistedStatusFor(status);

    await updatePaymentStatus(externalReference, {
      status: mappedStatus,
      // Persistimos metadata del provider para debugging.
      mpPaymentId: metadata?.mpPaymentId || null,
      mpStatus: metadata?.mpStatus || null,
      mpStatusDetail: metadata?.mpStatusDetail || null,
      approvedAt:
        mappedStatus === 'approved'
          ? metadata?.approvedAt || new Date().toISOString()
          : null,
    });

    console.log('[webhook] pago actualizado:', { externalReference, status: mappedStatus });

    // Disparo del mail de acceso.
    // Idempotencia: MP puede reintentar el webhook. Chequeamos que:
    //   1. el pago quedó approved,
    //   2. existe un email de comprador,
    //   3. no se envió antes (existing.emailSentAt es null/undefined),
    //   4. el estado ANTERIOR no era approved (primera vez que llegamos ahí).
    if (
      mappedStatus === 'approved' &&
      existing.buyerEmail &&
      !existing.emailSentAt &&
      existing.status !== 'approved'
    ) {
      const cursoTitle = CATALOGO_TITLES[existing.cursoSlug] || existing.cursoSlug;
      const result = await sendAccessEmail({
        to: existing.buyerEmail,
        cursoTitle,
        cursoSlug: existing.cursoSlug,
        externalReference,
      });

      if (result.sent) {
        await updatePaymentStatus(externalReference, {
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
    // Devolvemos 200 igual — si respondemos error, MP reintenta cientos de
    // veces. Preferimos loguear y no bloquear.
    return ok({ processed: false, error: err.message });
  }
};