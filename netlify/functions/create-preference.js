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
 *     preferenceId: "999-abc",
 *     initPoint: "https://www.mercadopago.com.ar/checkout/...",  // URL para redirigir
 *     externalReference: "inv_..."     // token único que la página del curso va a verificar
 *   }
 *
 * En MOCK_MODE devuelve una respuesta simulada que permite testear el flujo
 * completo sin credenciales reales de MP.
 */

import { MercadoPagoConfig, Preference } from 'mercadopago';
import { MOCK_MODE, MP_ACCESS_TOKEN, MP_MODE, SITE_URL, buildBackUrls, ok, error, preflight } from './_lib/config.js';
import { savePayment } from './_lib/store.js';

// Catálogo de cursos disponibles con su precio. Espejo de src/data/cursos.js
// (mantener sincronizado). En Fase 2 esto se lee de la DB.
const CATALOGO = {
  'vulnerabilidad-social': {
    title: 'Vulnerabilidad Social y Acumulación de Desventajas',
    price: 100,
  },
};

function generateExternalReference() {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

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

  const curso = CATALOGO[cursoSlug];
  const externalReference = generateExternalReference();

  // --- MODO MOCK ---------------------------------------------------
  // No persistimos nada. Solo generamos el ref y devolvemos la URL al mock
  // checkout. verify-payment en modo mock siempre acepta cualquier ref.
  if (MOCK_MODE) {
    console.log('[MOCK] Preference simulada:', externalReference);
    return ok({
      preferenceId: `mock_pref_${externalReference}`,
      initPoint: `${SITE_URL}/mock-checkout?ref=${externalReference}&slug=${cursoSlug}`,
      externalReference,
      mock: true,
    });
  }

  // --- MODO REAL ---------------------------------------------------
  try {
    const client = new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
      options: { timeout: 10000 },
    });
    const preferenceClient = new Preference(client);

    const backUrls = buildBackUrls(cursoSlug, externalReference);
    const isPublicUrl = SITE_URL.startsWith('https://');

    const preferenceBody = {
      items: [
        {
          id: cursoSlug,
          title: curso.title,
          quantity: 1,
          unit_price: curso.price,
          currency_id: 'ARS',
        },
      ],
      external_reference: externalReference,
      back_urls: backUrls,
      // auto_return y notification_url solo con URLs públicas —
      // MP rechaza localhost para ambas.
      ...(isPublicUrl && { auto_return: 'approved' }),
      ...(isPublicUrl && { notification_url: `${SITE_URL}/.netlify/functions/mp-webhook` }),
      statement_descriptor: 'INNOVA TS',
      metadata: { cursoSlug },
      ...(buyerEmail && { payer: { email: buyerEmail } }),
    };

    const preference = await preferenceClient.create({ body: preferenceBody });

    // Guardamos el pago con status pending. El webhook lo actualiza cuando
    // MP confirma la acreditación.
    await savePayment({
      externalReference,
      status: 'pending',
      amount: curso.price,
      currency: 'ARS',
      buyerEmail: buyerEmail || null,
      cursoSlug,
      mpPreferenceId: preference.id,
      mpPaymentId: null,
      createdAt: new Date().toISOString(),
    });

    // Determinar sandbox: priorizar la env var MP_MODE (explícita) y como
    // fallback chequear el prefijo del token. MP a veces devuelve init_point
    // de producción aunque la preferencia sea de test — hay que usar
    // sandbox_init_point en ese caso.
    const isSandboxToken = MP_MODE === 'sandbox' || MP_ACCESS_TOKEN.startsWith('TEST-');
    const initPoint = isSandboxToken
      ? (preference.sandbox_init_point || preference.init_point)
      : preference.init_point;

    return ok({
      preferenceId: preference.id,
      initPoint,
      externalReference,
    });
  } catch (err) {
    console.error('MP create preference error:', err);
    return error(500, 'No se pudo crear la preferencia de pago', {
      details: err.message,
    });
  }
};
