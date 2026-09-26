/**
 * Efectos secundarios de la aprobación de un pago.
 *
 * TODO camino que marque un pago como aprobado tiene que llamar a
 * onPaymentApproved(payment) después de persistir el nuevo estado:
 *   - mp-webhook.js                   (Mercado Pago real)
 *   - admin-payment-mark-approved.js  (aprobación manual del admin)
 *   - mock-approve.js                 (modo mock en develop)
 *
 * Hoy: registra el uso del cupón (si hubo).
 * A futuro: acá se engancha la facturación electrónica ARCA.
 *
 * Es idempotente y nunca lanza: un problema acá no debe impedir
 * que el pago quede aprobado ni que el alumno reciba su acceso.
 */

import { registerCouponUse } from './coupons.js';

export async function onPaymentApproved(payment) {
  const results = {};

  try {
    results.coupon = await registerCouponUse(payment);
  } catch (err) {
    console.error('[paymentApproval] error inesperado registrando cupón:', err);
    results.coupon = { registered: false, reason: 'error', error: err.message };
  }

  return results;
}