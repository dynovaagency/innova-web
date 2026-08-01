/**
 * GET /.netlify/functions/products-list
 *
 * Devuelve el listado público de productos activos.
 *
 * Query params opcionales:
 *   ?slug=xxx  → devuelve un solo producto (si existe y está activo)
 *
 * Es la fuente de verdad para el frontend. El archivo src/data/cursos.js
 * queda como fallback estático — si este endpoint falla, el frontend usa
 * los datos locales para no romperse.
 *
 * Se cachea en el CDN de Netlify por 60 segundos para bajar carga y
 * mejorar TTFB. Cuando el admin edite un producto, la próxima carga tarda
 * hasta 60s en verse en el frontend público. Aceptable para MVP.
 */

import { ok, error, preflight } from './_lib/config.js';
import * as productsRepo from './_lib/repositories/products.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const query = event.queryStringParameters || {};
  const { slug } = query;

  try {
    if (slug) {
      const product = await productsRepo.findBySlug(slug, { activeOnly: true });
      if (!product) {
        return error(404, 'Producto no encontrado o inactivo', { slug });
      }
      return withCache(ok(product));
    }

    const products = await productsRepo.findAll({ activeOnly: true });
    return withCache(ok({ products }));
  } catch (err) {
    console.error('[products-list] error:', err);
    return error(500, 'Error al obtener productos', { details: err.message });
  }
};

/**
 * Agrega headers de cache al response. 60s CDN, 30s browser.
 * Los productos cambian poco; cachear evita hits innecesarios a Blobs.
 */
const withCache = (response) => ({
  ...response,
  headers: {
    ...response.headers,
    'Cache-Control': 'public, max-age=30, s-maxage=60',
  },
});