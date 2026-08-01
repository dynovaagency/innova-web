/**
 * Repositorio de productos.
 *
 * Fuente de verdad del catálogo. A partir de la Entrega 4 el archivo
 * src/data/cursos.js pasa a ser fallback estático, y el catálogo real
 * vive en el store bajo el namespace 'products'.
 *
 * Cada producto se guarda con `slug` como key.
 *
 * En Fase 3 con Aiven, esto es una tabla `products` con constraint UNIQUE
 * en slug, y este repo se traduce directo a queries SQL.
 */

import { storeClient } from './_base.js';
import { validateProduct } from '../products/schema.js';

const store = storeClient('products');

/**
 * Lista productos. Por default solo activos.
 * Para el frontend público: siempre activeOnly=true.
 * Para el panel admin: activeOnly=false (para poder reactivar cosas).
 */
export const findAll = async ({ activeOnly = true } = {}) => {
  const all = await store.list();
  if (activeOnly) return all.filter((p) => p.active !== false);
  return all;
};

/**
 * Busca un producto por slug.
 * Si activeOnly=true (default), no devuelve productos desactivados
 * (protección contra que el frontend público muestre algo dado de baja).
 */
export const findBySlug = async (slug, { activeOnly = true } = {}) => {
  if (!slug) return null;
  const product = await store.get(slug);
  if (!product) return null;
  if (activeOnly && product.active === false) return null;
  return product;
};

/**
 * Inserta un producto nuevo.
 * Valida contra el schema antes de guardar. Falla si ya existe (por slug).
 */
export const insert = async (product) => {
  const { valid, errors } = validateProduct(product);
  if (!valid) {
    throw new Error(`Producto inválido: ${errors.join('; ')}`);
  }
  const existing = await store.get(product.slug);
  if (existing) {
    throw new Error(`Ya existe un producto con slug: ${product.slug}`);
  }
  const now = new Date().toISOString();
  const withMeta = {
    ...product,
    createdAt: now,
    updatedAt: now,
  };
  await store.set(product.slug, withMeta);
  return withMeta;
};

/**
 * Actualiza un producto existente (merge). Falla si no existe.
 * No permite cambiar slug (es la PK).
 */
export const update = async (slug, patch) => {
  const existing = await store.get(slug);
  if (!existing) {
    throw new Error(`Producto no encontrado: ${slug}`);
  }
  const merged = {
    ...existing,
    ...patch,
    slug: existing.slug, // el slug no se sobrescribe
    updatedAt: new Date().toISOString(),
  };
  const { valid, errors } = validateProduct(merged);
  if (!valid) {
    throw new Error(`Producto inválido tras update: ${errors.join('; ')}`);
  }
  await store.set(slug, merged);
  return merged;
};

/**
 * Soft delete: marca el producto como inactivo pero no lo borra.
 * Preserva la integridad referencial con pagos históricos.
 */
export const deactivate = async (slug) => {
  return await update(slug, { active: false });
};

/**
 * Reactiva un producto dado de baja.
 */
export const activate = async (slug) => {
  return await update(slug, { active: true });
};

/**
 * Reemplaza completamente el registro de un producto.
 * Se usa desde el script de seed cuando queremos idempotencia.
 * Salvo caso muy específico, preferir update().
 */
export const upsert = async (product) => {
  const { valid, errors } = validateProduct(product);
  if (!valid) {
    throw new Error(`Producto inválido: ${errors.join('; ')}`);
  }
  const existing = await store.get(product.slug);
  const now = new Date().toISOString();
  const withMeta = {
    ...product,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await store.set(product.slug, withMeta);
  return withMeta;
};