/**
 * Interfaz que todo payment provider debe implementar.
 *
 * Un provider expone tres operaciones:
 *
 *   1. createCheckout(input) → { checkoutUrl, providerReference, metadata }
 *      Crea una intención de pago del lado del provider y devuelve la URL
 *      a la que redirigir al usuario.
 *
 *   2. verifyPayment(providerPaymentId) → { status, amount, currency, ... }
 *      Consulta al provider el estado real de un pago dado su ID.
 *      Se usa desde el webhook para tener la fuente de verdad.
 *
 *   3. parseWebhook(request) → { paymentId, eventType } | null
 *      Extrae la info relevante del payload del webhook del provider.
 *      Cada provider tiene su propio formato; esta función lo normaliza.
 *
 * Todos los providers hablan el mismo lenguaje:
 *   - status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'unknown'
 *   - currency: 'ARS' | 'USD'
 *   - amount: número
 *
 * Cada provider además puede devolver un objeto `metadata` con datos
 * específicos suyos (por ej. mpPreferenceId), que la function que consume
 * puede guardar en el registro del pago para debugging o para llamar al
 * provider más tarde.
 */

/**
 * Estados internos normalizados. Cada provider mapea sus propios estados
 * a estos cuatro.
 */
export const PAYMENT_STATUS = Object.freeze({
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  UNKNOWN: 'unknown',
});

/**
 * Shape esperado de un provider. Un provider es un objeto con estas
 * tres funciones. Ver mercadopago.js como referencia de implementación.
 *
 * @typedef {Object} PaymentProvider
 * @property {string} name - identificador del provider (ej. 'mercadopago')
 * @property {(input: CheckoutInput) => Promise<CheckoutResult>} createCheckout
 * @property {(providerPaymentId: string) => Promise<PaymentDetails>} verifyPayment
 * @property {(request: WebhookRequest) => WebhookInfo | null} parseWebhook
 */

/**
 * @typedef {Object} CheckoutInput
 * @property {Object} product - { slug, title, price, currency }
 * @property {string} [buyerEmail]
 * @property {string} externalReference - ID nuestro que el provider debe echoback
 * @property {Object} backUrls - { success, failure, pending }
 * @property {string} notificationUrl - URL del webhook nuestro
 */

/**
 * @typedef {Object} CheckoutResult
 * @property {string} checkoutUrl - URL a la que redirigir al usuario
 * @property {string} providerReference - ID del checkout del lado del provider
 * @property {Object} metadata - Datos específicos del provider
 */

/**
 * @typedef {Object} PaymentDetails
 * @property {string} status - Uno de PAYMENT_STATUS
 * @property {string} statusDetail - Detalle libre del provider (para logging)
 * @property {number} amount
 * @property {string} currency
 * @property {string} externalReference - El que armamos nosotros
 * @property {Object} metadata - Datos crudos del provider
 */

/**
 * @typedef {Object} WebhookRequest
 * @property {Object} headers
 * @property {Object|string} body - Ya parseado o string crudo
 * @property {Object} queryStringParameters
 */

/**
 * @typedef {Object} WebhookInfo
 * @property {string} paymentId - ID del pago del lado del provider
 * @property {string} eventType - Tipo de evento (ej. 'payment', 'refund')
 */