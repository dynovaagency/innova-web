/**
 * Registry de tipos de producto y tipos de contenido disponibles.
 *
 * PRODUCT_TYPES: qué clase de producto es (cápsula, curso sincrónico, etc.).
 *   Determina qué campos específicos requiere y qué flujo de compra usa.
 *
 * CONTENT_TYPES: cómo se entrega el contenido post-pago.
 *   - embed: iframe en la página del curso (Genially, YouTube, Vimeo, etc.)
 *   - external_link: botón que abre en pestaña nueva (Meet, Teams, Zoom)
 *
 * Un mismo PRODUCT_TYPE puede tener distintos CONTENT_TYPES. Por ejemplo,
 * una capsula_genially puede embeber Genially (embed) o linkear a una
 * grabación en Vimeo con auth (external_link).
 *
 * Para agregar un tipo de producto nuevo:
 *   1. Agregar la constante en PRODUCT_TYPES.
 *   2. Agregar la entrada en TYPE_METADATA.
 *   3. Agregar el validador en products/schema.js.
 *   4. Agregar el componente de UI (formulario admin, página de detalle).
 */

export const PRODUCT_TYPES = Object.freeze({
  CAPSULA_GENIALLY: 'capsula_genially',
  // Futuro:
  // CURSO_SINCRONICO: 'curso_sincronico',
  // SUPERVISION: 'supervision',
});

/**
 * Metadata descriptiva de cada tipo de producto.
 * Útil para dropdowns y etiquetas en el panel admin.
 */
export const TYPE_METADATA = Object.freeze({
  [PRODUCT_TYPES.CAPSULA_GENIALLY]: {
    label: 'Cápsula formativa',
    description: 'Contenido autogestivo o reunión en vivo. Acceso post-pago según contentType.',
    deliveryMethod: 'variable', // depende del contentType del producto
  },
});

/**
 * Tipos de contenido que puede tener un producto.
 * Determina cómo se renderiza en la página post-pago.
 */
export const CONTENT_TYPES = Object.freeze({
  EMBED: 'embed',
  EXTERNAL_LINK: 'external_link',
});

/**
 * Metadata descriptiva de cada tipo de contenido.
 */
export const CONTENT_TYPE_METADATA = Object.freeze({
  [CONTENT_TYPES.EMBED]: {
    label: 'Embebido',
    description: 'Se muestra directamente en la página del curso (Genially, YouTube, Vimeo, Google Slides).',
  },
  [CONTENT_TYPES.EXTERNAL_LINK]: {
    label: 'Link externo',
    description: 'Botón que abre en pestaña nueva. Para contenidos que no permiten embed (Meet, Teams, Zoom).',
  },
});

/**
 * Devuelve true si el tipo de producto es válido y está registrado.
 */
export const isValidType = (type) => {
  return Object.values(PRODUCT_TYPES).includes(type);
};

/**
 * Devuelve true si el tipo de contenido es válido.
 */
export const isValidContentType = (type) => {
  return Object.values(CONTENT_TYPES).includes(type);
};

/**
 * Devuelve la lista de todos los tipos de producto registrados.
 * Útil para dropdowns del panel admin.
 */
export const getAllTypes = () => {
  return Object.values(PRODUCT_TYPES).map((type) => ({
    value: type,
    ...TYPE_METADATA[type],
  }));
};

/**
 * Devuelve la lista de todos los tipos de contenido.
 * Útil para el selector del ABM.
 */
export const getAllContentTypes = () => {
  return Object.values(CONTENT_TYPES).map((type) => ({
    value: type,
    ...CONTENT_TYPE_METADATA[type],
  }));
};