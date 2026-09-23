/**
 * POST /.netlify/functions/create-preference
 *
 * Crea la preferencia de Mercado Pago.
 *
 * Body:
 *   {
 *     cursoSlug: "vulnerabilidad-social",
 *     buyerEmail: "usuario@example.com",   // obligatorio
 *     couponCode?: "VERANO20"               // opcional
 *   }
 *
 * Response:
 *   { preferenceId, initPoint, externalReference, amount, discountApplied }
 *
 * Mercado Pago está habilitado para cápsulas y cursos (hotfix Payway).
 *
 * Cupones: el descuento se recalcula acá (nunca confiamos en el monto
 * del frontend). El uso del cupón se registra recién cuando el pago se
 * aprueba (mp-webhook / admin-payment-mark-approved).
 */

import { SITE_URL, buildBackUrls, ok, error, preflight } from './_lib/config.js';
import { getProvider } from './_lib/providers/payment/index.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import * as productsRepo from './_lib/repositories/products.js';
import { validateCoupon } from './_lib/coupons.js';

// Regex básico de email. Sincronizado con el del frontend.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { cursoSlug, buyerEmail, couponCode } = payload;

  if (!cursoSlug) {
    return error(400, 'cursoSlug es requerido');
  }

  // Validación de email obligatorio.
  if (!buyerEmail || typeof buyerEmail !== 'string') {
    return error(400, 'buyerEmail es requerido para enviar el acceso al curso');
  }
  const normalizedEmail = buyerEmail.trim();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return error(400, 'buyerEmail no tiene un formato válido');
  }

  const product = await productsRepo.findBySlug(cursoSlug, { activeOnly: true });
  if (!product) {
    return error(404, 'Producto no encontrado o inactivo', { cursoSlug });
  }

  // ---------- Cupón (opcional) ----------
  let amount = product.price;
  let couponData = null;

  if (couponCode) {
    try {
      const result = await validateCoupon({
        code: couponCode,
        product,
        paymentMethod: 'mercadopago',
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
      console.error('[create-preference] error validando cupón:', err);
      return error(500, 'No pudimos validar el código de descuento. Intentá de nuevo.');
    }
  }

  const externalReference = generateExternalReference();

  try {
    const provider = getProvider('mercadopago');
    const isPublicUrl = SITE_URL.startsWith('https://');
    const notificationUrl = isPublicUrl
      ? `${SITE_URL}/.netlify/functions/mp-webhook`
      : null;

    // Pasamos una copia del producto con el precio ya descontado,
    // así el provider arma la preferencia con el monto correcto.
    const { checkoutUrl, providerReference, metadata } = await provider.createCheckout({
      product: { ...product, price: amount },
      buyerEmail: normalizedEmail,
      externalReference,
      backUrls: buildBackUrls(cursoSlug, externalReference),
      notificationUrl,
    });

    await paymentsRepo.insert({
      externalReference,
      status: 'pending',
      amount,
      currency: product.currency || 'ARS',
      buyerEmail: normalizedEmail,
      cursoSlug,
      productTitle: product.title,
      provider: provider.name,
      providerReference,
      providerMetadata: metadata,
      mpPreferenceId: metadata?.mpPreferenceId || providerReference,
      mpPaymentId: null,
      createdAt: new Date().toISOString(),
      ...(couponData || {}),
    });

    return ok({
      preferenceId: providerReference,
      initPoint: checkoutUrl,
      externalReference,
      amount,
      discountApplied: couponData?.discountApplied || 0,
      ...(metadata?.mock && { mock: true }),
    });
  } catch (err) {
    console.error('create-preference error:', err);
    return error(500, 'No se pudo crear la preferencia de pago', {
      details: err.message,
    });
  }
};