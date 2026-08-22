/**
 * POST /.netlify/functions/create-manual-payment
 *
 * Crea un pago pendiente para métodos de pago manuales (transferencia
 * bancaria, Go Cuotas). A diferencia de create-preference, no habla con
 * ningún provider externo — solo persiste el pago con status='pending'
 * para que Innova lo confirme después vía admin-payment-mark-approved.
 *
 * Body:
 *   {
 *     cursoSlug: string,
 *     buyerEmail: string,
 *     paymentMethod: 'transferencia' | 'gocuotas'
 *   }
 *
 * Response:
 *   200 {
 *     externalReference: string,
 *     paymentMethod: string,
 *     amount: number,             ← el precio efectivo cobrado
 *     message: string
 *   }
 *
 * Sprint 2.7: usa el precio específico del método si el producto lo tiene.
 *   - Si el producto tiene priceTransferencia y el método es 'transferencia',
 *     se cobra ese monto.
 *   - Si el producto tiene priceGocuotas y el método es 'gocuotas',
 *     se cobra ese monto.
 *   - Si no hay precio específico, cae al price base.
 */

import { ok, error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import * as productsRepo from './_lib/repositories/products.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_METHODS = ['transferencia', 'gocuotas', 'payway'];

const generateExternalReference = () => {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

// Resuelve el precio final a cobrar según el método de pago.
// Si el producto tiene precio específico para ese método, lo usa.
// Si no, cae al precio base.
const resolvePrice = (product, paymentMethod) => {
  if (paymentMethod === 'transferencia' && product.priceTransferencia) {
    return product.priceTransferencia;
  }
  if (paymentMethod === 'gocuotas' && product.priceGocuotas) {
    return product.priceGocuotas;
  }
  return product.price;
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

  const { cursoSlug, buyerEmail, paymentMethod } = payload;

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

  // Sprint 2.9: las cápsulas solo pueden pagarse con MercadoPago (flujo
  // automático). Los métodos manuales (transferencia, Go Cuotas) están
  // reservados para cursos, que tienen ticket más alto y ameritan cuotas
  // o descuento por transferencia.
  if (product.modalidad === 'capsula') {
    return error(400, 'Este producto solo puede pagarse con MercadoPago', {
      modalidad: product.modalidad,
      paymentMethod,
    });
  }

  // Resolver el precio efectivo según el método
  const effectivePrice = resolvePrice(product, paymentMethod);

  const externalReference = generateExternalReference();

  try {
    await paymentsRepo.insert({
      externalReference,
      status: 'pending',
      amount: effectivePrice,
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
        appliedPrice: effectivePrice,
        hasMethodDiscount: effectivePrice !== product.price,
      },
      mpPreferenceId: null,
      mpPaymentId: null,
      createdAt: new Date().toISOString(),
    });

    console.log(
      `[create-manual-payment] pago pendiente creado: ${externalReference}`,
      { paymentMethod, cursoSlug, buyerEmail: normalizedEmail, amount: effectivePrice }
    );

    const messages = {
      transferencia: 'Cuando confirmemos la transferencia, te enviamos el link de acceso por email.',
      gocuotas: 'Cuando confirmemos el pago desde Go Cuotas, te enviamos el link de acceso por email.',
      payway: 'Cuando confirmemos el pago desde Payway, te enviamos el link de acceso por email.',
    };

    return ok({
      externalReference,
      paymentMethod,
      amount: effectivePrice,
      message: messages[paymentMethod],
    });
  } catch (err) {
    console.error('[create-manual-payment] error:', err);
    return error(500, 'No se pudo registrar el pago', {
      details: err.message,
    });
  }
};