/**
 * POST /.netlify/functions/admin-product-upsert
 *
 * Crea o actualiza un producto (upsert). Protegido con requireAdmin.
 *
 * Body:
 *   {
 *     slug, type, title, subtitle, description, price, currency, active,
 *     category, duration, featured, imageUrl, contentType, contentUrl,
 *     modalidad,
 *     priceTransferencia, priceGocuotas, gocuotasUrl  ← Sprint 2.7
 *   }
 *
 * Los 3 campos nuevos son opcionales:
 *   - priceTransferencia: precio final para transferencia bancaria.
 *   - priceGocuotas: precio final para Go Cuotas.
 *   - gocuotasUrl: link específico de Go Cuotas para este producto.
 *
 * Si vienen null o vacíos, se guardan como null (no se aplica precio específico).
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as productsRepo from './_lib/repositories/products.js';
import { validateProduct } from './_lib/products/schema.js';

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

// Convierte un valor de precio opcional del payload a número o null.
// Aceptamos: número, string numérico, string vacío, null, undefined.
const parseOptionalPrice = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (isNaN(n) || n <= 0) return null;
  return n;
};

const parseOptionalUrl = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
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

  const productData = {
    slug,
    type: payload.type || 'capsula_genially',
    title: (payload.title || '').trim(),
    subtitle: (payload.subtitle || '').trim(),
    description: (payload.description || '').trim(),
    price: Number(payload.price),
    currency: payload.currency || 'ARS',
    active: payload.active !== false,
    category: (payload.category || '').trim(),
    duration: (payload.duration || '').trim(),
    featured: payload.featured === true,
    imageUrl: (payload.imageUrl || '').trim(),
    contentType: payload.contentType || 'embed',
    contentUrl: (payload.contentUrl || payload.geniallyUrl || '').trim(),
    modalidad: payload.modalidad || 'capsula',
    // Sprint 2.7: precios por método (opcionales)
    priceTransferencia: parseOptionalPrice(payload.priceTransferencia),
    priceGocuotas: parseOptionalPrice(payload.priceGocuotas),
    gocuotasUrl: parseOptionalUrl(payload.gocuotasUrl),
  };

  const validation = validateProduct(productData);
  if (!validation.valid) {
    return error(400, 'Datos de producto inválidos', {
      validation: validation.errors,
    });
  }

  try {
    const existing = await productsRepo.findBySlug(slug, { activeOnly: false });
    const created = !existing;

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