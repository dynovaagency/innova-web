/**
 * Resuelve el título de un producto para un pago dado.
 *
 * Orden de preferencia:
 *   1. Snapshot del título guardado en el pago (payment.productTitle).
 *      Es el estado del producto al momento de la compra. Preserva el
 *      histórico correcto aunque el título haya cambiado después.
 *
 *   2. Lookup del producto en el catálogo actual, por slug.
 *      Fallback para pagos previos a Entrega 4 que no tienen snapshot.
 *
 *   3. El propio cursoSlug del pago.
 *      Fallback último para no dejar el mail o el reporte sin nombre
 *      si el producto fue eliminado del catálogo por completo.
 *
 * Se usa desde:
 *   - mp-webhook.js (para el subject/body del mail de acceso).
 *   - recuperar-acceso.js (para el listado de cursos comprados).
 *   - Panel admin (Sprint 2) para reportes.
 */

import * as productsRepo from '../repositories/products.js';

export const resolveProductTitle = async (payment) => {
  if (payment.productTitle) return payment.productTitle;

  try {
    const product = await productsRepo.findBySlug(payment.cursoSlug, {
      activeOnly: false,
    });
    if (product?.title) return product.title;
  } catch (err) {
    console.warn(
      '[title-resolver] fallback silencioso, no se pudo consultar el catálogo:',
      err.message
    );
  }

  return payment.cursoSlug;
};

/**
 * Versión bulk: resuelve títulos para múltiples pagos, minimizando
 * consultas al catálogo (memoriza por slug los productos ya buscados).
 *
 * Devuelve un Map de externalReference → title, mismo orden que el input.
 *
 * Útil en recuperar-acceso y en reportes del panel admin.
 */
export const resolveProductTitlesBulk = async (payments) => {
  const results = new Map();
  const productCache = new Map(); // slug → title | null

  for (const payment of payments) {
    // Snapshot: ya lo tenemos.
    if (payment.productTitle) {
      results.set(payment.externalReference, payment.productTitle);
      continue;
    }

    // Catálogo: consultamos una vez por slug.
    if (!productCache.has(payment.cursoSlug)) {
      try {
        const product = await productsRepo.findBySlug(payment.cursoSlug, {
          activeOnly: false,
        });
        productCache.set(payment.cursoSlug, product?.title || null);
      } catch (err) {
        console.warn('[title-resolver bulk] error:', err.message);
        productCache.set(payment.cursoSlug, null);
      }
    }

    const cached = productCache.get(payment.cursoSlug);
    results.set(payment.externalReference, cached || payment.cursoSlug);
  }

  return results;
};