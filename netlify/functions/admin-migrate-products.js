/**
 * POST /.netlify/functions/admin-migrate-products
 *
 * Function TEMPORAL para migrar los productos existentes al nuevo schema
 * de la Entrega 3.5 del Sprint 2:
 *   - Agrega category, duration, featured, imageUrl.
 *   - Migra geniallyUrl → contentUrl.
 *   - Agrega contentType: 'embed' por default.
 *
 * Protegida con SEED_SECRET.
 *
 * Modo dryRun por default para poder verificar antes de escribir.
 *
 * SE BORRA DESPUÉS DE USAR.
 *
 * Uso:
 *   curl -X POST https://innovatrabajosocial.com.ar/.netlify/functions/admin-migrate-products \
 *     -H "X-Seed-Secret: EL_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"dryRun": true}'
 */

import * as productsRepo from './_lib/repositories/products.js';
import { CONTENT_TYPES } from './_lib/products/types.js';

const REQUIRED_SECRET = process.env.SEED_SECRET;

// Datos por defecto para completar productos existentes que no tienen
// los campos nuevos. La cápsula de Vulnerabilidad Social recibe los
// valores que corresponden a su contenido real.
const MIGRATION_DEFAULTS = {
  'vulnerabilidad-social': {
    category: 'Intervención Social',
    duration: '25 horas acreditadas',
    featured: true,
    imageUrl: '', // Innova la carga cuando quiera desde el panel
  },
};

// Default fallback si aparece un slug no listado arriba
const FALLBACK_DEFAULTS = {
  category: 'General',
  duration: 'A tu ritmo',
  featured: false,
  imageUrl: '',
};

const adaptProduct = (product) => {
  const defaults = MIGRATION_DEFAULTS[product.slug] || FALLBACK_DEFAULTS;

  // Migrar geniallyUrl → contentUrl, con contentType embed por default
  const contentUrl = product.contentUrl || product.geniallyUrl || '';
  const contentType = product.contentType || CONTENT_TYPES.EMBED;

  return {
    ...product,
    category: product.category || defaults.category,
    duration: product.duration || defaults.duration,
    featured: product.featured !== undefined ? product.featured : defaults.featured,
    imageUrl: product.imageUrl || defaults.imageUrl,
    contentUrl,
    contentType,
    migratedAt: new Date().toISOString(),
  };
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const secret =
    event.headers['x-seed-secret'] || event.headers['X-Seed-Secret'];
  if (!REQUIRED_SECRET || secret !== REQUIRED_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    // Body opcional; default a dryRun=true por seguridad.
  }
  const dryRun = payload.dryRun !== false;

  try {
    const all = await productsRepo.findAll({ activeOnly: false });
    const results = {
      dryRun,
      totalFound: all.length,
      migrated: [],
      alreadyMigrated: [],
      errors: [],
    };

    for (const product of all) {
      try {
        // Check si ya está migrado (tiene todos los campos nuevos)
        const alreadyHasNewFields =
          product.category &&
          product.duration &&
          product.contentUrl &&
          product.contentType;

        if (alreadyHasNewFields) {
          results.alreadyMigrated.push({ slug: product.slug });
          continue;
        }

        const adapted = adaptProduct(product);

        if (dryRun) {
          results.migrated.push({
            slug: adapted.slug,
            wouldMigrate: true,
            adapted: {
              category: adapted.category,
              duration: adapted.duration,
              featured: adapted.featured,
              contentUrl: adapted.contentUrl,
              contentType: adapted.contentType,
            },
          });
        } else {
          await productsRepo.upsert(adapted);
          results.migrated.push({
            slug: adapted.slug,
            migrated: true,
          });
        }
      } catch (err) {
        results.errors.push({
          slug: product.slug,
          error: err.message,
        });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results, null, 2),
    };
  } catch (err) {
    console.error('[admin-migrate-products] error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};