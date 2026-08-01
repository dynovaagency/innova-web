/**
 * Payment provider: MercadoPago (Checkout Pro).
 *
 * Implementa la interfaz definida en ./interface.js.
 *
 * En modo MOCK_MODE, no llama a MP real: devuelve una URL local que apunta
 * a /mock-checkout, misma UX que teníamos antes del refactor.
 */

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import {
  MOCK_MODE,
  MP_ACCESS_TOKEN,
  MP_MODE,
  SITE_URL,
} from '../../config.js';
import { PAYMENT_STATUS } from './interface.js';

const NAME = 'mercadopago';

/**
 * Cliente lazy — se instancia solo cuando se usa, no al importar el módulo.
 * Evita fallar en modo mock si el token no está seteado.
 */
let _client = null;
const getMPClient = () => {
  if (_client) return _client;
  if (!MP_ACCESS_TOKEN) {
    throw new Error('MP_ACCESS_TOKEN no configurado');
  }
  _client = new MercadoPagoConfig({
    accessToken: MP_ACCESS_TOKEN,
    options: { timeout: 10000 },
  });
  return _client;
};

/**
 * Mapea los estados de MP a nuestros estados internos normalizados.
 *
 * MP status values:
 *   approved       → APPROVED
 *   pending        → PENDING
 *   in_process     → PENDING
 *   authorized     → PENDING (no confirmado aún)
 *   rejected       → REJECTED
 *   cancelled      → CANCELLED
 *   refunded       → CANCELLED (tratamos refund como cancelación para acceso)
 *   charged_back   → CANCELLED
 */
const mapMPStatus = (mpStatus) => {
  switch (mpStatus) {
    case 'approved':
      return PAYMENT_STATUS.APPROVED;
    case 'pending':
    case 'in_process':
    case 'authorized':
      return PAYMENT_STATUS.PENDING;
    case 'rejected':
      return PAYMENT_STATUS.REJECTED;
    case 'cancelled':
    case 'refunded':
    case 'charged_back':
      return PAYMENT_STATUS.CANCELLED;
    default:
      return PAYMENT_STATUS.UNKNOWN;
  }
};

/**
 * Crea un checkout en MP. En modo mock, devuelve URL local.
 */
const createCheckout = async ({
  product,
  buyerEmail,
  externalReference,
  backUrls,
  notificationUrl,
}) => {
  // Modo mock: sin llamada real a MP.
  if (MOCK_MODE) {
    return {
      checkoutUrl: `${SITE_URL}/mock-checkout?ref=${externalReference}&slug=${product.slug}`,
      providerReference: `mock_pref_${externalReference}`,
      metadata: { mock: true },
    };
  }

  const client = getMPClient();
  const preferenceClient = new Preference(client);
  const isPublicUrl = SITE_URL.startsWith('https://');

  const preferenceBody = {
    items: [
      {
        id: product.slug,
        title: product.title,
        quantity: 1,
        unit_price: product.price,
        currency_id: product.currency || 'ARS',
      },
    ],
    external_reference: externalReference,
    back_urls: backUrls,
    // MP rechaza localhost para auto_return y notification_url.
    ...(isPublicUrl && { auto_return: 'approved' }),
    ...(isPublicUrl && notificationUrl && { notification_url: notificationUrl }),
    statement_descriptor: 'INNOVA TS',
    metadata: { cursoSlug: product.slug },
    ...(buyerEmail && { payer: { email: buyerEmail } }),
  };

  const preference = await preferenceClient.create({ body: preferenceBody });

  // Sandbox vs producción: MP a veces devuelve init_point de producción
  // aunque la preferencia sea de test. Priorizamos sandbox_init_point cuando
  // detectamos que estamos en sandbox.
  const isSandboxToken =
    MP_MODE === 'sandbox' || MP_ACCESS_TOKEN.startsWith('TEST-');
  const checkoutUrl = isSandboxToken
    ? preference.sandbox_init_point || preference.init_point
    : preference.init_point;

  return {
    checkoutUrl,
    providerReference: preference.id,
    metadata: {
      mpPreferenceId: preference.id,
      mode: isSandboxToken ? 'sandbox' : 'production',
    },
  };
};

/**
 * Consulta a MP los detalles de un pago dado su ID.
 *
 * Se usa desde el webhook para tener la fuente de verdad (nunca confiar
 * en el body del webhook para actualizar estado — MP puede reintentar y
 * mandar payloads viejos).
 */
const verifyPayment = async (providerPaymentId) => {
  if (MOCK_MODE) {
    // En mock, el webhook se dispara desde mock-approve.js que le pasa
    // directo el estado deseado. No se consulta a MP.
    throw new Error('verifyPayment no aplica en MOCK_MODE');
  }

  const client = getMPClient();
  const paymentClient = new Payment(client);
  const payment = await paymentClient.get({ id: providerPaymentId });

  return {
    status: mapMPStatus(payment.status),
    statusDetail: payment.status_detail || payment.status,
    amount: payment.transaction_amount,
    currency: payment.currency_id,
    externalReference: payment.external_reference,
    metadata: {
      mpPaymentId: String(payment.id),
      mpStatus: payment.status,
      mpStatusDetail: payment.status_detail,
      mpPreferenceId: payment.preference_id,
      approvedAt: payment.date_approved,
    },
  };
};

/**
 * Extrae la info relevante del webhook de MP.
 *
 * MP manda notificaciones con formato:
 *   POST /webhook
 *   Body: { type: "payment", data: { id: "1234..." } }
 *
 * También puede llegar como query string:
 *   GET/POST /webhook?type=payment&data.id=1234
 *
 * Devuelve null si el evento no es relevante o el payload no matchea.
 */
const parseWebhook = (request) => {
  const { body, queryStringParameters } = request;

  // Preferimos el body si vino con contenido.
  let payload = null;
  if (typeof body === 'string' && body.length > 0) {
    try {
      payload = JSON.parse(body);
    } catch {
      payload = null;
    }
  } else if (typeof body === 'object' && body !== null) {
    payload = body;
  }

  // Extraemos type y data.id desde donde estén.
  const type =
    payload?.type ||
    payload?.action?.split('.')[0] ||
    queryStringParameters?.type ||
    null;

  const paymentId =
    payload?.data?.id ||
    payload?.id ||
    queryStringParameters?.['data.id'] ||
    queryStringParameters?.id ||
    null;

  if (type !== 'payment' || !paymentId) return null;

  return {
    paymentId: String(paymentId),
    eventType: type,
  };
};

/**
 * Objeto provider exportado. Cumple con la shape definida en interface.js.
 */
const mercadopagoProvider = {
  name: NAME,
  createCheckout,
  verifyPayment,
  parseWebhook,
};

export default mercadopagoProvider;