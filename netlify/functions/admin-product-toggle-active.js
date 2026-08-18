/**
 * POST /.netlify/functions/admin-product-toggle-active
 *
 * Cambia el estado active de un producto sin modificar el resto.
 * Protegido con requireAdmin.
 *
 * Body: { slug: string, active: boolean }
 *
 * Response:
 *   200 { product }
 *   404 { error: 'Producto no encontrado' }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as productsRepo from './_lib/repositories/products.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { slug, active } = payload;
  if (!slug) return error(400, 'slug es requerido');
  if (typeof active !== 'boolean') return error(400, 'active debe ser boolean');

  try {
    const existing = await productsRepo.findBySlug(slug, { activeOnly: false });
    if (!existing) {
      return error(404, 'Producto no encontrado', { slug });
    }

    const updated = {
      ...existing,
      active,
      updatedAt: new Date().toISOString(),
    };
    await productsRepo.update(slug, updated);

    console.log(
      `[admin-product-toggle-active] ${slug} → ${active ? 'activo' : 'inactivo'}`,
      { admin: auth.admin.email }
    );

    return ok({ product: updated });
  } catch (err) {
    console.error('[admin-product-toggle-active] error:', err);
    return error(500, 'No se pudo cambiar el estado', { details: err.message });
  }
};