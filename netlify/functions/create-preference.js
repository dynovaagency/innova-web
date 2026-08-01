/**
 * POST /.netlify/functions/create-preference
 *
 * Recibe:
 *   {
 *     cursoSlug: "vulnerabilidad-social",
 *     buyerEmail: "usuario@example.com"   // opcional pero recomendado
 *   }
 *
 * Devuelve:
 *   {
 *     preferenceId: "42585009-...",
 *     initPoint: "https://www.mercadopago.com.ar/checkout/..." | "/mock-checkout?...",
 *     externalReference: "inv_..."
 *   }
 *
 * Refactor Entrega 4: elimina el CATALOGO local; consume products via
 * productsRepo. La fuente de verdad del catálogo pasa a ser Netlify Blobs.
 */

import { SITE_URL, buildBackUrls, ok, error, preflight } from './_lib/config.js';
import { getProvider } from './_lib/providers/payment/index.js';
import { savePayment } from './_lib/store.js';
import * as productsRepo from './_lib/repositories/products.js';

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

  // Consulta el producto en el blob. Si no existe o está inactivo, no
  // se puede iniciar checkout.
  const product = await productsRepo.findBySlug(cursoSlug, { activeOnly: true });
  if (!product) {
    return error(404, 'Producto no encontrado o inactivo', { cursoSlug });
  }

  const externalReference = generateExternalReference();

  try {
    const provider = getProvider('mercadopago');
    const isPublicUrl = SITE_URL.startsWith('https://');
    const notificationUrl = isPublicUrl
      ? `${SITE_URL}/.netlify/functions/mp-webhook`
      : null;

    const { checkoutUrl, providerReference, metadata } = await provider.createCheckout({
      product,
      buyerEmail: buyerEmail || null,
      externalReference,
      backUrls: buildBackUrls(cursoSlug, externalReference),
      notificationUrl,
    });

    await savePayment({
      externalReference,
      status: 'pending',
      amount: product.price,
      currency: product.currency || 'ARS',
      buyerEmail: buyerEmail || null,
      cursoSlug,
      productTitle: product.title,   // ← snapshot del title al momento de la compra
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