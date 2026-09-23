/**
 * POST /.netlify/functions/create-manual-payment
 *
 * Crea un pago pendiente para métodos de pago manuales (transferencia
 * bancaria, Go Cuotas). No habla con ningún provider externo — solo
 * persiste el pago con status='pending' para que Innova lo confirme
 * después vía admin-payment-mark-approved.
 *
 * Body:
 *   {
 *     cursoSlug: string,
 *     buyerEmail: string,
 *     paymentMethod: 'transferencia' | 'gocuotas',
 *     couponCode?: string
 *   }
 *
 * Response:
 *   200 { externalReference, paymentMethod, amount, discountApplied, message }
 *
 * Precio: usa el precio específico del método si el producto lo tiene
 * (priceTransferencia / priceGocuotas). El cupón se aplica sobre ese precio.
 */

import { ok, error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import * as productsRepo from './_lib/repositories/products.js';
import { validateCoupon, resolveMethodPrice } from './_lib/coupons.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_METHODS = ['transferencia', 'gocuotas', 'payway'];

const generateExternalReference = () => {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { cursoSlug, buyerEmail, paymentMethod, couponCode } = payload;

  if (!cursoSlug) {
    return error(400, 'cursoSlug es requerido');
  }

  if (!buyerEmail || typeof buyerEmail !== 'string') {
    return error(400, 'buyerEmail es requerido para enviar el acceso al curso');
  }
  const normalizedEmail = buyerEmail.trim();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return error(400, 'buyerEmail no tiene un formato válido');
  }

  if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
    return error(400, `paymentMethod debe ser uno de: ${VALID_METHODS.join(', ')}`);
  }

  const product = await productsRepo.findBySlug(cursoSlug, { activeOnly: true });
  if (!product) {
    return error(404, 'Producto no encontrado o inactivo', { cursoSlug });
  }

  // Las cápsulas solo pueden pagarse con MercadoPago (flujo automático).
  if (product.modalidad === 'capsula') {
    return error(400, 'Este producto solo puede pagarse con MercadoPago', {
      modalidad: product.modalidad,
      paymentMethod,
    });
  }

  // Precio efectivo según el método
  const methodPrice = resolveMethodPrice(product, paymentMethod);

  // ---------- Cupón (opcional) ----------
  let amount = methodPrice;
  let couponData = null;

  if (couponCode) {
    try {
      const result = await validateCoupon({
        code: couponCode,
        product,
        paymentMethod,
        buyerEmail: normalizedEmail,
      });
      if (!result.valid) {
        return error(400, result.message, { reason: result.reason });
      }
      amount = result.finalAmount;
      couponData = {
        couponId: result.coupon.id,
        couponCode: result.coupon.code,
        originalAmount: result.originalAmount,
        discountApplied: result.discountApplied,
      };
    } catch (err) {
      console.error('[create-manual-payment] error validando cupón:', err);
      return error(500, 'No pudimos validar el código de descuento. Intentá de nuevo.');
    }
  }

  const externalReference = generateExternalReference();

  try {
    await paymentsRepo.insert({
      externalReference,
      status: 'pending',
      amount,
      currency: product.currency || 'ARS',
      buyerEmail: normalizedEmail,
      cursoSlug,
      productTitle: product.title,
      provider: paymentMethod,
      providerReference: null,
      providerMetadata: {
        method: paymentMethod,
        awaitingManualApproval: true,
        basePrice: product.price,
        methodPrice,
        appliedPrice: amount,
        hasMethodDiscount: methodPrice !== product.price,
        couponCode: couponData?.couponCode || null,
      },
      mpPreferenceId: null,
      mpPaymentId: null,
      createdAt: new Date().toISOString(),
      ...(couponData || {}),
    });

    console.log(
      `[create-manual-payment] pago pendiente creado: ${externalReference}`,
      { paymentMethod, cursoSlug, buyerEmail: normalizedEmail, amount, coupon: couponData?.couponCode || null }
    );

    const messages = {
      transferencia: 'Cuando confirmemos la transferencia, te enviamos el link de acceso por email.',
      gocuotas: 'Cuando confirmemos el pago desde Go Cuotas, te enviamos el link de acceso por email.',
      payway: 'Cuando confirmemos el pago desde Payway, te enviamos el link de acceso por email.',
    };

    return ok({
      externalReference,
      paymentMethod,
      amount,
      discountApplied: couponData?.discountApplied || 0,
      message: messages[paymentMethod],
    });
  } catch (err) {
    console.error('[create-manual-payment] error:', err);
    return error(500, 'No se pudo registrar el pago', {
      details: err.message,
    });
  }
};