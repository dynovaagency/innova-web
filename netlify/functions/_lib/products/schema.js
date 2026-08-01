/**
 * Schema y validador de productos.
 *
 * Un producto tiene:
 *   - Campos comunes: id/slug/title/description/price/currency/active/type.
 *   - Campos específicos por type (ver TYPE_SPECIFIC_FIELDS).
 *
 * validateProduct(product) devuelve { valid, errors }.
 * Si valid es false, errors es un array de strings describiendo problemas.
 *
 * Se usa en:
 *   - Al insertar/actualizar productos vía el panel admin (Sprint 2).
 *   - Al seedear el catálogo desde cursos.js (Entrega 4).
 *   - Como sanity check en products-list.js antes de servir al frontend.
 */

import { PRODUCT_TYPES, isValidType } from './types.js';

/**
 * Campos requeridos para todo producto, sin importar el type.
 */
const COMMON_REQUIRED_FIELDS = ['slug', 'type', 'title', 'price', 'currency', 'active'];

/**
 * Campos específicos por type. Cada value es una función que recibe
 * el producto y devuelve un array de errores (vacío si válido).
 *
 * Al agregar un tipo nuevo, sumar acá su validador específico.
 */
const TYPE_SPECIFIC_VALIDATORS = {
  [PRODUCT_TYPES.CAPSULA_GENIALLY]: (product) => {
    const errors = [];
    if (!product.geniallyUrl || typeof product.geniallyUrl !== 'string') {
      errors.push('geniallyUrl es requerido para productos tipo capsula_genially');
    }
    if (product.geniallyUrl && !product.geniallyUrl.startsWith('https://')) {
      errors.push('geniallyUrl debe empezar con https://');
    }
    return errors;
  },
  // Futuro:
  // [PRODUCT_TYPES.CURSO_SINCRONICO]: (product) => { ... valida meetLink, fechaInicio, cupo, ... }
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
  for (const field of COMMON_REQUIRED_FIELDS) {
    if (product[field] === undefined || product[field] === null || product[field] === '') {
      errors.push(`Campo requerido faltante: ${field}`);
    }
  }

  // 3. Type debe estar registrado.
  if (product.type && !isValidType(product.type)) {
    errors.push(`Type inválido: ${product.type}`);
  }

  // 4. Validaciones de tipo específico.
  if (product.type && isValidType(product.type)) {
    const typeValidator = TYPE_SPECIFIC_VALIDATORS[product.type];
    if (typeValidator) {
      errors.push(...typeValidator(product));
    }
  }

  // 5. Sanity checks numéricos y de dominio.
  if (product.price !== undefined && (typeof product.price !== 'number' || product.price < 0)) {
    errors.push('price debe ser un número >= 0');
  }
  if (product.currency && !['ARS', 'USD'].includes(product.currency)) {
    errors.push(`currency inválido: ${product.currency}. Debe ser ARS o USD.`);
  }
  if (product.active !== undefined && typeof product.active !== 'boolean') {
    errors.push('active debe ser boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Helper: devuelve la estructura mínima de un producto con los campos
 * comunes. Útil para el ABM del panel: se arranca con esto y se le
 * suman los campos específicos del tipo.
 */
export const emptyProduct = (type = PRODUCT_TYPES.CAPSULA_GENIALLY) => ({
  slug: '',
  type,
  title: '',
  description: '',
  price: 0,
  currency: 'ARS',
  active: true,
});