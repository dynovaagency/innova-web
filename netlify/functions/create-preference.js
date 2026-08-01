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
 * Refactor de Entrega 3: la lógica de MP se movió al provider. Este handler
 * ya no habla directo con MercadoPago; le delega la creación del checkout.
 * Cuando sumemos más providers, este mismo handler se puede parametrizar
 * (ej. via query string `?provider=paypal`) sin reescribirlo entero.
 */

import { SITE_URL, buildBackUrls, ok, error, preflight } from './_lib/config.js';
import { getProvider } from './_lib/providers/payment/index.js';
import { savePayment } from './_lib/store.js';

// Catálogo mínimo local. Se elimina en Entrega 4 cuando pasemos a leer del blob
// via productsRepo.findBySlug(). Por ahora lo mantenemos para no tocar el
// flujo completo en una sola entrega.
const CATALOGO = {
  'vulnerabilidad-social': {
    slug: 'vulnerabilidad-social',
    type: 'capsula_genially',
    title: 'Vulnerabilidad Social y Acumulación de Desventajas',
    price: 28000,
    currency: 'ARS',
  },
};

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

  if (!cursoSlug || !CATALOGO[cursoSlug]) {
    return error(400, 'cursoSlug inválido o no está en el catálogo', { cursoSlug });
  }

  const product = CATALOGO[cursoSlug];
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

    // Guardamos el pago con status pending. El webhook lo actualiza cuando
    // el provider confirma la acreditación.
    await savePayment({
      externalReference,
      status: 'pending',
      amount: product.price,
      currency: product.currency || 'ARS',
      buyerEmail: buyerEmail || null,
      cursoSlug,
      provider: provider.name,
      providerReference,
      providerMetadata: metadata,
      // Mantenemos alias legacy para no romper mp-webhook.js hasta el
      // refactor completo (Entrega 4).
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