/**
 * Schema y validador de productos.
 *
 * Un producto tiene:
 *   - Campos comunes: id/slug/title/description/price/currency/active/type.
 *   - Campos específicos por type (ver TYPE_SPECIFIC_VALIDATORS).
 *   - Campos de presentación pública (Entrega 3.5): category, duration,
 *     featured, imageUrl, contentType, contentUrl.
 *   - Modalidad (Sprint 2.6): capsula | curso. Determina el label mostrado
 *     en las cards y en el detalle público. No cambia el flujo técnico.
 *
 * validateProduct(product) devuelve { valid, errors }.
 * Si valid es false, errors es un array de strings describiendo problemas.
 *
 * Se usa en:
 *   - Al insertar/actualizar productos vía el panel admin (Sprint 2).
 *   - Al seedear el catálogo desde cursos.js (Entrega 4).
 *   - Como sanity check en products-list.js antes de servir al frontend.
 *   - Como defensa en profundidad dentro de productsRepo.insert/update/upsert.
 */

import { PRODUCT_TYPES, isValidType, CONTENT_TYPES, isValidContentType } from './types.js';

/**
 * Modalidades disponibles. Determinan el label público de la card.
 * capsula: contenido asincrónico (default).
 * curso: contenido con clases en vivo o cohortes.
 */
export const MODALIDADES = Object.freeze({
  CAPSULA: 'capsula',
  CURSO: 'curso',
});

const isValidModalidad = (m) => Object.values(MODALIDADES).includes(m);

/**
 * Campos requeridos para todo producto, sin importar el type.
 */
const COMMON_REQUIRED_FIELDS = [
  'slug', 'type', 'title', 'price', 'currency', 'active',
  'category', 'duration', 'contentType', 'contentUrl',
];

const isValidUrl = (url) => {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const TYPE_SPECIFIC_VALIDATORS = {
  [PRODUCT_TYPES.CAPSULA_GENIALLY]: (product) => {
    return [];
  },
};

export const validateProduct = (product) => {
  const errors = [];

  if (!product || typeof product !== 'object') {
    return { valid: false, errors: ['Producto debe ser un objeto'] };
  }

  // Retrocompatibilidad: aceptamos geniallyUrl como fallback de contentUrl,
  // y contentType default 'embed' si no viene.
  const productToValidate = {
    ...product,
    contentUrl: product.contentUrl || product.geniallyUrl,
    contentType: product.contentType || CONTENT_TYPES.EMBED,
    modalidad: product.modalidad || MODALIDADES.CAPSULA,
  };

  for (const field of COMMON_REQUIRED_FIELDS) {
    const value = productToValidate[field];
    if (value === undefined || value === null || value === '') {
      errors.push(`Campo requerido faltante: ${field}`);
    }
  }

  if (product.type && !isValidType(product.type)) {
    errors.push(`Type inválido: ${product.type}`);
  }

  if (productToValidate.contentType && !isValidContentType(productToValidate.contentType)) {
    errors.push(`contentType inválido: ${productToValidate.contentType}. Debe ser embed o external_link.`);
  }

  if (productToValidate.contentUrl && !isValidUrl(productToValidate.contentUrl)) {
    errors.push('contentUrl debe empezar con http:// o https://');
  }

  if (productToValidate.modalidad && !isValidModalidad(productToValidate.modalidad)) {
    errors.push(`modalidad inválida: ${productToValidate.modalidad}. Debe ser capsula o curso.`);
  }

  if (product.type && isValidType(product.type)) {
    const typeValidator = TYPE_SPECIFIC_VALIDATORS[product.type];
    if (typeValidator) {
      errors.push(...typeValidator(product));
    }
  }

  if (product.price !== undefined && (typeof product.price !== 'number' || product.price < 0)) {
    errors.push('price debe ser un número >= 0');
  }
  if (product.currency && !['ARS', 'USD'].includes(product.currency)) {
    errors.push(`currency inválido: ${product.currency}. Debe ser ARS o USD.`);
  }
  if (product.active !== undefined && typeof product.active !== 'boolean') {
    errors.push('active debe ser boolean');
  }

  if (product.featured !== undefined && typeof product.featured !== 'boolean') {
    errors.push('featured debe ser boolean');
  }
  if (product.imageUrl && !isValidUrl(product.imageUrl)) {
    errors.push('imageUrl debe empezar con http:// o https://');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Helper: devuelve la estructura mínima de un producto con los campos
 * comunes y de presentación. Útil para el ABM del panel: se arranca con
 * esto y se le suman los campos específicos del tipo si hace falta.
 */
export const emptyProduct = (type = PRODUCT_TYPES.CAPSULA_GENIALLY) => ({
  slug: '',
  type,
  title: '',
  description: '',
  price: 0,
  currency: 'ARS',
  active: true,
  category: '',
  duration: '',
  featured: false,
  imageUrl: '',
  contentType: CONTENT_TYPES.EMBED,
  contentUrl: '',
  modalidad: MODALIDADES.CAPSULA,
});