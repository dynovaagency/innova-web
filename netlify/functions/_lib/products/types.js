/**
 * Registry de tipos de producto disponibles en la plataforma.
 *
 * Cada producto tiene un `type` que determina:
 *   - Qué campos específicos requiere (además de los comunes).
 *   - Qué flujo de entrega usa post-pago (iframe embebido, email con link, etc.).
 *   - Qué componente de UI lo renderiza.
 *
 * Para agregar un tipo nuevo:
 *   1. Agregar la constante acá.
 *   2. Agregar la entrada correspondiente en TYPE_METADATA.
 *   3. Agregar el validador de campos específicos en products/schema.js.
 *   4. Agregar el componente de UI (formulario admin, página de detalle, etc.).
 */

export const PRODUCT_TYPES = Object.freeze({
  CAPSULA_GENIALLY: 'capsula_genially',
  // Futuro:
  // CURSO_SINCRONICO: 'curso_sincronico',
  // SUPERVISION: 'supervision',
});

/**
 * Metadata descriptiva de cada tipo. Útil para el panel admin
 * (etiquetas legibles, ícono, descripción corta).
 */
export const TYPE_METADATA = Object.freeze({
  [PRODUCT_TYPES.CAPSULA_GENIALLY]: {
    label: 'Cápsula formativa (Genially)',
    description: 'Contenido autogestivo hosteado en Genially. Acceso vía iframe post-pago.',
    deliveryMethod: 'iframe_embed',
  },
});

/**
 * Devuelve true si el tipo es válido y está registrado.
 */
export const isValidType = (type) => {
  return Object.values(PRODUCT_TYPES).includes(type);
};

/**
 * Devuelve la lista de todos los tipos registrados.
 * Útil para dropdowns del panel admin.
 */
export const getAllTypes = () => {
  return Object.values(PRODUCT_TYPES).map((type) => ({
    value: type,
    ...TYPE_METADATA[type],
  }));
};