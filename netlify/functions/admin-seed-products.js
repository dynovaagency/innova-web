/**
 * POST /.netlify/functions/admin-seed-products
 *
 * Function TEMPORAL para poblar el blob de productos desde cursos.js.
 * Protegida con un secret enviado en header X-Seed-Secret.
 *
 * SE BORRA DESPUÉS DE USAR. No forma parte del sistema definitivo.
 */

import { cursos } from '../../src/data/cursos.js';
import * as productsRepo from './_lib/repositories/products.js';
import { validateProduct } from './_lib/products/schema.js';

const REQUIRED_SECRET = process.env.SEED_SECRET;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret = event.headers['x-seed-secret'] || event.headers['X-Seed-Secret'];
  if (!REQUIRED_SECRET || secret !== REQUIRED_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const results = [];
  for (const curso of cursos) {
    const { valid, errors } = validateProduct(curso);
    if (!valid) {
      results.push({ slug: curso.slug, ok: false, errors });
      continue;
    }
    try {
      await productsRepo.upsert(curso);
      results.push({ slug: curso.slug, ok: true });
    } catch (err) {
      results.push({ slug: curso.slug, ok: false, error: err.message });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seeded: results }, null, 2),
  };
};