/**
 * GET /.netlify/functions/admin-product-get?slug=<slug>
 *
 * Devuelve un producto por slug. Protegido con requireAdmin.
 * Devuelve activos e inactivos (a diferencia del endpoint público).
 *
 * Response:
 *   200 { product: {...} }
 *   404 { error: 'Producto no encontrado' }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as productsRepo from './_lib/repositories/products.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  const slug = event.queryStringParameters?.slug;
  if (!slug) {
    return error(400, 'slug es requerido');
  }

  try {
    const product = await productsRepo.findBySlug(slug, { activeOnly: false });
    if (!product) {
      return error(404, 'Producto no encontrado', { slug });
    }
    return ok({ product });
  } catch (err) {
    console.error('[admin-product-get] error:', err);
    return error(500, 'No se pudo obtener el producto', {
      details: err.message,
    });
  }
};