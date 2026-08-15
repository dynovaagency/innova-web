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
 *   - Precios por método de pago (Sprint 2.7): priceTransferencia,
 *     priceGocuotas, gocuotasUrl. Todos opcionales. Si vienen, sobreescriben
 *     el precio base para ese método específico.
 *
 * validateProduct(product) devuelve { valid, errors }.
 * Si valid es false, errors es un array de strings describiendo problemas.
 */

import { PRODUCT_TYPES, isValidType, CONTENT_TYPES, isValidContentType } from './types.js';

export const MODALIDADES = Object.freeze({
  CAPSULA: 'capsula',
  CURSO: 'curso',
});

const isValidModalidad = (m) => Object.values(MODALIDADES).includes(m);

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

  // Precios por método (Sprint 2.7): opcionales. Si vienen, deben ser
  // números > 0. Un precio de 0 (gratis) por método específico es un caso
  // borde raro; si en el futuro se necesita, cambiar la validación a >= 0.
  if (product.priceTransferencia !== undefined && product.priceTransferencia !== null && product.priceTransferencia !== '') {
    const p = Number(product.priceTransferencia);
    if (isNaN(p) || p <= 0) {
      errors.push('priceTransferencia debe ser un número mayor a 0');
    }
  }
  if (product.priceGocuotas !== undefined && product.priceGocuotas !== null && product.priceGocuotas !== '') {
    const p = Number(product.priceGocuotas);
    if (isNaN(p) || p <= 0) {
      errors.push('priceGocuotas debe ser un número mayor a 0');
    }
  }

  // gocuotasUrl (opcional): link específico de Go Cuotas para este producto.
  // Si viene, se usa. Si no, el frontend cae al GOCUOTAS_URL global.
  if (product.gocuotasUrl && !isValidUrl(product.gocuotasUrl)) {
    errors.push('gocuotasUrl debe empezar con http:// o https://');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

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
  priceTransferencia: null,
  priceGocuotas: null,
  gocuotasUrl: '',
});