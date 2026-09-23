/**
 * POST /.netlify/functions/coupons-validate
 *
 * Valida un código de descuento para una compra (endpoint público).
 * Solo informa; el descuento real se recalcula y aplica en
 * create-preference / create-manual-payment (nunca confiamos en el frontend).
 *
 * Body: { code, cursoSlug, paymentMethod, buyerEmail? }
 *
 * Response 200:
 *   { valid: true, code, discountType, discountValue,
 *     originalAmount, discountApplied, finalAmount }
 *   { valid: false, reason, message }
 */

import { ok, error, preflight } from './_lib/config.js';
import * as productsRepo from './_lib/repositories/products.js';
import { validateCoupon } from './_lib/coupons.js';

const VALID_METHODS = ['mercadopago', 'transferencia', 'gocuotas', 'payway'];

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { code, cursoSlug, paymentMethod, buyerEmail } = payload;

  if (!code) return error(400, 'code es requerido');
  if (!cursoSlug) return error(400, 'cursoSlug es requerido');
  if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
    return error(400, `paymentMethod debe ser uno de: ${VALID_METHODS.join(', ')}`);
  }

  try {
    const product = await productsRepo.findBySlug(cursoSlug, { activeOnly: true });
    if (!product) return error(404, 'Producto no encontrado o inactivo');

    const result = await validateCoupon({ code, product, paymentMethod, buyerEmail });

    if (!result.valid) {
      return ok({ valid: false, reason: result.reason, message: result.message });
    }

    return ok({
      valid: true,
      code: result.coupon.code,
      discountType: result.coupon.discount_type,
      discountValue: Number(result.coupon.discount_value),
      originalAmount: result.originalAmount,
      discountApplied: result.discountApplied,
      finalAmount: result.finalAmount,
    });
  } catch (err) {
    console.error('[coupons-validate] error:', err);
    return error(500, 'No pudimos validar el código. Intentá de nuevo.');
  }
};