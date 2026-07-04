/**
 * POST /.netlify/functions/mp-webhook
 *
 * Notificación asíncrona de Mercado Pago cuando cambia el estado de un pago.
 * MP envía un POST con: { type: "payment", data: { id: "12345" } }
 *
 * Nuestro trabajo:
 *   1. Consultar la API de MP para obtener el detalle del pago.
 *   2. Extraer el external_reference (nuestro token).
 *   3. Actualizar el registro en Blobs con el nuevo estado.
 *
 * MP reintenta la notificación si respondemos con error. Devolver 200 siempre
 * que hayamos procesado (incluso si el evento no es relevante), para que MP
 * no siga insistiendo.
 */

import { MercadoPagoConfig, Payment } from 'mercadopago';
import { MOCK_MODE, MP_ACCESS_TOKEN, ok, error, preflight } from './_lib/config.js';
import { updatePaymentStatus, getPayment } from './_lib/store.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return error(405, 'Method not allowed');
  }

  // MP a veces manda info por query params y otras por body. Contemplamos ambos.
  const query = event.queryStringParameters || {};
  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    // ignoramos body inválido, puede ser un test de MP
  }

  const type = body.type || query.type;
  const paymentId = body.data?.id || query['data.id'] || query.id;

  console.log('[webhook] recibido:', { type, paymentId });

  // Solo procesamos eventos de tipo "payment". Los demás (merchant_order, etc)
  // los ignoramos con 200 OK para que MP no reintente.
  if (type !== 'payment' || !paymentId) {
    return ok({ ignored: true, reason: 'not a payment event' });
  }

  // --- MODO MOCK ---------------------------------------------------
  // En mock no llamamos a MP. Esperamos que el mock-checkout ya haya actualizado
  // el status directamente. Este endpoint queda como no-op.
  if (MOCK_MODE) {
    console.log('[MOCK] webhook ignorado en modo mock');
    return ok({ mock: true, ignored: true });
  }

  // --- MODO REAL ---------------------------------------------------
  try {
    const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: paymentId });

    const externalReference = payment.external_reference;
    if (!externalReference) {
      console.warn('[webhook] pago sin external_reference:', paymentId);
      return ok({ processed: false, reason: 'no external_reference' });
    }

    const existing = await getPayment(externalReference);
    if (!existing) {
      console.warn('[webhook] no encontramos el pago en el store:', externalReference);
      return ok({ processed: false, reason: 'unknown external_reference' });
    }

    // Mapear el status de MP al nuestro. Los estados de MP son:
    // approved, pending, in_process, rejected, cancelled, refunded, charged_back
    // Nosotros solo distinguimos approved / pending / rejected.
    let mappedStatus = 'pending';
    if (payment.status === 'approved') mappedStatus = 'approved';
    else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(payment.status)) {
      mappedStatus = 'rejected';
    }

    await updatePaymentStatus(externalReference, {
      status: mappedStatus,
      mpPaymentId: String(payment.id),
      mpStatus: payment.status,
      mpStatusDetail: payment.status_detail,
      approvedAt: mappedStatus === 'approved' ? new Date().toISOString() : null,
    });

    console.log('[webhook] pago actualizado:', { externalReference, status: mappedStatus });
    return ok({ processed: true, externalReference, status: mappedStatus });
  } catch (err) {
    console.error('[webhook] error:', err);
    // Devolvemos 200 igual — si respondemos error, MP va a reintentar cientos
    // de veces. Preferimos loguear y no bloquear.
    return ok({ processed: false, error: err.message });
  }
};
