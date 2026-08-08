/**
 * GET /.netlify/functions/admin-payment-get?ref=inv_...
 *
 * Devuelve el detalle completo de un pago por externalReference.
 * Protegido con requireAdmin. A diferencia del list, incluye providerMetadata.
 *
 * Response:
 *   200 { payment, accessUrl }
 *   404 { error: 'Pago no encontrado' }
 *
 * accessUrl se construye server-side usando SITE_URL de producción, no la
 * URL del ambiente donde se está mirando el panel. Esto evita que un admin
 * mirando desde develop copie un link "de develop" y se lo mande a un cliente.
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';

// URL productiva del sitio, hardcodeada por diseño: el link de acceso que
// se muestra al admin siempre apunta al dominio real donde el cliente puede
// acceder al contenido, independiente de dónde esté el admin mirando el panel.
const PRODUCTION_URL = 'https://innovatrabajosocial.com.ar';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  const ref = event.queryStringParameters?.ref;
  if (!ref) {
    return error(400, 'ref es requerido');
  }

  try {
    const payment = await paymentsRepo.findByReference(ref);
    if (!payment) {
      return error(404, 'Pago no encontrado', { ref });
    }

    // Construir el link de acceso apuntando siempre a producción.
    const accessUrl = payment.cursoSlug && payment.externalReference
      ? `${PRODUCTION_URL}/curso/${payment.cursoSlug}?ref=${encodeURIComponent(payment.externalReference)}`
      : null;

    return ok({ payment, accessUrl });
  } catch (err) {
    console.error('[admin-payment-get] error:', err);
    return error(500, 'No se pudo obtener el pago', {
      details: err.message,
    });
  }
};