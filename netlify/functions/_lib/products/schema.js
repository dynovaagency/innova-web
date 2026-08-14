/**
 * Schema y validador de productos.
 *
 * Un producto tiene:
 *   - Campos comunes: id/slug/title/description/price/currency/active/type.
 *   - Campos específicos por type (ver TYPE_SPECIFIC_VALIDATORS).
 *   - Campos de presentación pública (Entrega 3.5): category, duration,
 *     featured, imageUrl, contentType, contentUrl.
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
 * Campos requeridos para todo producto, sin importar el type.
 * Actualizado en Entrega 3.5 con los campos de presentación pública.
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

/**
 * Campos específicos por type. Cada value es una función que recibe
 * el producto y devuelve un array de errores (vacío si válido).
 *
 * NOTA: desde Entrega 3.5 el contentType y contentUrl son comunes, no
 * específicos del tipo. Este validador ahora hace validaciones extra
 * que solo aplican a capsula_genially (ej. warnings específicos).
 *
 * Al agregar un tipo nuevo, sumar acá su validador específico.
 */
const TYPE_SPECIFIC_VALIDATORS = {
  [PRODUCT_TYPES.CAPSULA_GENIALLY]: (product) => {
    // No hay validaciones específicas adicionales a las comunes.
    // Se mantiene la key para preservar el patrón.
    return [];
  },
  // Futuro:
  // [PRODUCT_TYPES.CURSO_SINCRONICO]: (product) => { ... valida fechaInicio, cupo, ... }
};

/**
 * Valida un producto completo. Devuelve { valid, errors }.
 */
export const validateProduct = (product) => {
  const errors = [];

  // 1. Debe ser un objeto.
  if (!product || typeof product !== 'object') {
    return { valid: false, errors: ['Producto debe ser un objeto'] };
  }

  // 2. Chequeo de campos comunes requeridos.
  // Aceptamos geniallyUrl como fallback de contentUrl (retrocompatibilidad
  // durante la migración de la Entrega 3.5).
  const productToValidate = {
    ...product,
    contentUrl: product.contentUrl || product.geniallyUrl,
    contentType: product.contentType || CONTENT_TYPES.EMBED,
  };

  for (const field of COMMON_REQUIRED_FIELDS) {
    const value = productToValidate[field];
    if (value === undefined || value === null || value === '') {
      errors.push(`Campo requerido faltante: ${field}`);
    }
  }

  // 3. Type debe estar registrado.
  if (product.type && !isValidType(product.type)) {
    errors.push(`Type inválido: ${product.type}`);
  }

  // 4. ContentType debe ser válido.
  if (productToValidate.contentType && !isValidContentType(productToValidate.contentType)) {
    errors.push(`contentType inválido: ${productToValidate.contentType}. Debe ser embed o external_link.`);
  }

  // 5. ContentUrl debe ser URL válida.
  if (productToValidate.contentUrl && !isValidUrl(productToValidate.contentUrl)) {
    errors.push('contentUrl debe empezar con http:// o https://');
  }

  // 6. Validaciones de tipo específico.
  if (product.type && isValidType(product.type)) {
    const typeValidator = TYPE_SPECIFIC_VALIDATORS[product.type];
    if (typeValidator) {
      errors.push(...typeValidator(product));
    }
  }

  // 7. Sanity checks numéricos y de dominio.
  if (product.price !== undefined && (typeof product.price !== 'number' || product.price < 0)) {
    errors.push('price debe ser un número >= 0');
  }
  if (product.currency && !['ARS', 'USD'].includes(product.currency)) {
    errors.push(`currency inválido: ${product.currency}. Debe ser ARS o USD.`);
  }
  if (product.active !== undefined && typeof product.active !== 'boolean') {
    errors.push('active debe ser boolean');
  }

  // 8. Validaciones de campos de presentación (Entrega 3.5).
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
});