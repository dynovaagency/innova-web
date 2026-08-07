/**
 * GET /.netlify/functions/admin-products-list
 *
 * Devuelve todos los productos del catálogo, incluyendo inactivos.
 * Protegido con requireAdmin.
 *
 * A diferencia del endpoint público /products-list, este:
 *   - Requiere sesión admin.
 *   - Devuelve todos los productos (activos e inactivos).
 *   - Sin cache (los admins necesitan ver cambios inmediatos).
 *
 * Response:
 *   {
 *     products: [
 *       { slug, type, title, subtitle, description, price, currency,
 *         active, geniallyUrl, createdAt, updatedAt }
 *     ]
 *   }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as productsRepo from './_lib/repositories/products.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  try {
    const products = await productsRepo.findAll({ activeOnly: false });
    // Orden: activos primero, después por título alfabético
    products.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (a.title || '').localeCompare(b.title || '');
    });
    return ok({ products });
  } catch (err) {
    console.error('[admin-products-list] error:', err);
    return error(500, 'No se pudo obtener el listado de cápsulas', {
      details: err.message,
    });
  }
};