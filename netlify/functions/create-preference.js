/**
 * POST /.netlify/functions/create-preference
 *
 * Recibe:
 *   {
 *     cursoSlug: "vulnerabilidad-social",
 *     buyerEmail: "usuario@example.com"   // OBLIGATORIO desde ahora
 *   }
 *
 * Devuelve:
 *   {
 *     preferenceId: "42585009-...",
 *     initPoint: "https://www.mercadopago.com.ar/checkout/..." | "/mock-checkout?...",
 *     externalReference: "inv_..."
 *   }
 *
 * El email es OBLIGATORIO desde este cambio. Sin email, el comprador no
 * recibe el mail de acceso y queda "huérfano" en el sistema (situación que
 * ya ocurrió en producción). El frontend también lo valida, esto es la
 * segunda línea de defensa.
 *
 * Sprint 2.10: MercadoPago está restringido solo a cápsulas. Los cursos
 * usan transferencia bancaria o Go Cuotas (create-manual-payment.js).
 * Esta restricción es de defensa en profundidad: el frontend ya oculta MP
 * de los cursos en el PaymentModal, esto bloquea intentos de bypass.
 */

import { SITE_URL, buildBackUrls, ok, error, preflight } from './_lib/config.js';
import { getProvider } from './_lib/providers/payment/index.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import * as productsRepo from './_lib/repositories/products.js';

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

  const { cursoSlug, buyerEmail } = payload;

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

  // Sprint 2.10: los cursos no aceptan MercadoPago. Solo transferencia
  // o Go Cuotas (via create-manual-payment).
 // if (product.modalidad === 'curso') {
 //   return error(400, 'Este producto solo puede pagarse con transferencia bancaria o Go Cuotas', {
 //     modalidad: product.modalidad,
 //   });
 // }

  const externalReference = generateExternalReference();

  try {
    const provider = getProvider('mercadopago');
    const isPublicUrl = SITE_URL.startsWith('https://');
    const notificationUrl = isPublicUrl
      ? `${SITE_URL}/.netlify/functions/mp-webhook`
      : null;

    const { checkoutUrl, providerReference, metadata } = await provider.createCheckout({
      product,
      buyerEmail: normalizedEmail,
      externalReference,
      backUrls: buildBackUrls(cursoSlug, externalReference),
      notificationUrl,
    });

    await paymentsRepo.insert({
      externalReference,
      status: 'pending',
      amount: product.price,
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
    });

    return ok({
      preferenceId: providerReference,
      initPoint: checkoutUrl,
      externalReference,
      ...(metadata?.mock && { mock: true }),
    });
  } catch (err) {
    console.error('create-preference error:', err);
    return error(500, 'No se pudo crear la preferencia de pago', {
      details: err.message,
    });
  }
};