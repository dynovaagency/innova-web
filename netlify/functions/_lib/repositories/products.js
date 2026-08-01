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

// El store se instancia lazy — la primera vez que se necesita, no al import.
// Esto evita el error MissingBlobsEnvironmentError cuando el bundler de
// Netlify carga el módulo antes de inicializar el contexto de Blobs.
let _store = null;
const getStore = () => {
  if (!_store) _store = storeClient('products');
  return _store;
};

export const findAll = async ({ activeOnly = true } = {}) => {
  const all = await getStore().list();
  if (activeOnly) return all.filter((p) => p.active !== false);
  return all;
};

export const findBySlug = async (slug, { activeOnly = true } = {}) => {
  if (!slug) return null;
  const product = await getStore().get(slug);
  if (!product) return null;
  if (activeOnly && product.active === false) return null;
  return product;
};

export const insert = async (product) => {
  const { valid, errors } = validateProduct(product);
  if (!valid) {
    throw new Error(`Producto inválido: ${errors.join('; ')}`);
  }
  const existing = await getStore().get(product.slug);
  if (existing) {
    throw new Error(`Ya existe un producto con slug: ${product.slug}`);
  }
  const now = new Date().toISOString();
  const withMeta = {
    ...product,
    createdAt: now,
    updatedAt: now,
  };
  await getStore().set(product.slug, withMeta);
  return withMeta;
};

export const update = async (slug, patch) => {
  const existing = await getStore().get(slug);
  if (!existing) {
    throw new Error(`Producto no encontrado: ${slug}`);
  }
  const merged = {
    ...existing,
    ...patch,
    slug: existing.slug,
    updatedAt: new Date().toISOString(),
  };
  const { valid, errors } = validateProduct(merged);
  if (!valid) {
    throw new Error(`Producto inválido tras update: ${errors.join('; ')}`);
  }
  await getStore().set(slug, merged);
  return merged;
};

export const deactivate = async (slug) => {
  return await update(slug, { active: false });
};

export const activate = async (slug) => {
  return await update(slug, { active: true });
};

export const upsert = async (product) => {
  const { valid, errors } = validateProduct(product);
  if (!valid) {
    throw new Error(`Producto inválido: ${errors.join('; ')}`);
  }
  const existing = await getStore().get(product.slug);
  const now = new Date().toISOString();
  const withMeta = {
    ...product,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await getStore().set(product.slug, withMeta);
  return withMeta;
};