/**
 * Efectos secundarios de la aprobación de un pago.
 *
 * TODO camino que marque un pago como aprobado tiene que llamar a
 * onPaymentApproved(payment) después de persistir el nuevo estado:
 *   - mp-webhook.js                   (Mercado Pago real)
 *   - admin-payment-mark-approved.js  (aprobación manual del admin)
 *   - mock-approve.js                 (modo mock en develop)
 *
 * Hace:
 *   - Registra el uso del cupón (si hubo).
 *   - Programa la factura electrónica (si la facturación está activa y
 *     el pago es posterior a la fecha de corte).
 *
 * Es idempotente y nunca lanza: un problema acá no debe impedir
 * que el pago quede aprobado ni que el alumno reciba su acceso.
 */

import { registerCouponUse } from './coupons.js';
import { scheduleInvoice } from './invoicing.js';

export async function onPaymentApproved(payment) {
  const results = {};

  try {
    results.coupon = await registerCouponUse(payment);
  } catch (err) {
    console.error('[paymentApproval] error inesperado registrando cupón:', err);
    results.coupon = { registered: false, reason: 'error', error: err.message };
  }

  // scheduleInvoice nunca lanza; el try es por las dudas.
  try {
    results.invoice = await scheduleInvoice(payment);
  } catch (err) {
    console.error('[paymentApproval] error inesperado programando factura:', err);
    results.invoice = { scheduled: false, reason: 'error', error: err.message };
  }

  return results;
}