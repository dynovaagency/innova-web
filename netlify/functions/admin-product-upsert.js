/**
 * POST /.netlify/functions/admin-product-upsert
 *
 * Crea o actualiza un producto (upsert). Protegido con requireAdmin.
 *
 * Body:
 *   {
 *     slug: string (requerido),
 *     type: 'capsula_genially' (v2.0),
 *     title: string,
 *     subtitle: string opcional,
 *     description: string,
 *     price: number,
 *     currency: 'ARS' | 'USD',
 *     active: boolean,
 *     geniallyUrl: string (para tipo capsula_genially)
 *   }
 *
 * Comportamiento:
 *   - Si el slug ya existe: actualiza (preserva createdAt original).
 *   - Si no existe: crea con createdAt = ahora.
 *   - En ambos casos updatedAt = ahora.
 *   - Valida el schema antes de escribir (dos veces: acá y en el repo,
 *     que valida internamente en upsert).
 *
 * Response:
 *   200 { product, created: boolean }
 *   400 { error, validation: [...] }  // errores de validación
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as productsRepo from './_lib/repositories/products.js';
import { validateProduct } from './_lib/products/schema.js';

// Normaliza el slug: lowercase, sin espacios, sin caracteres raros.
// Solo letras, números y guiones.
const normalizeSlug = (raw) => {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

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

  const slug = normalizeSlug(payload.slug);
  if (!slug) {
    return error(400, 'slug es requerido');
  }

  // Armar el producto a validar/guardar
  const productData = {
    slug,
    type: payload.type || 'capsula_genially',
    title: (payload.title || '').trim(),
    subtitle: (payload.subtitle || '').trim(),
    description: (payload.description || '').trim(),
    price: Number(payload.price),
    currency: payload.currency || 'ARS',
    active: payload.active !== false, // default true si no viene
    geniallyUrl: (payload.geniallyUrl || '').trim(),
  };

  // Validar contra schema (early return con mensaje amigable)
  const validation = validateProduct(productData);
  if (!validation.valid) {
    return error(400, 'Datos de producto inválidos', {
      validation: validation.errors,
    });
  }

  try {
    // Verificar si el producto ya existe (para saber si es create o update).
    // El repo hace upsert internamente, pero necesitamos este dato para el response.
    const existing = await productsRepo.findBySlug(slug, { activeOnly: false });
    const created = !existing;

    // upsert() del repo se encarga de preservar createdAt si ya existe
    // y de setear updatedAt en ambos casos.
    const saved = await productsRepo.upsert(productData);

    console.log(
      `[admin-product-upsert] ${created ? 'creado' : 'actualizado'}: ${slug}`,
      { admin: auth.admin.email }
    );

    return ok({ product: saved, created });
  } catch (err) {
    console.error('[admin-product-upsert] error:', err);
    return error(500, 'No se pudo guardar el producto', {
      details: err.message,
    });
  }
};