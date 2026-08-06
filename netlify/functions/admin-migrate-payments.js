/**
 * POST /.netlify/functions/admin-migrate-payments
 *
 * Function TEMPORAL para migrar pagos del namespace viejo (`innova-payments`)
 * al namespace nuevo (`payments`).
 *
 * Contexto:
 *   En Etapa 1, el store viejo (netlify/functions/_lib/store.js) guardaba los
 *   pagos en un blob namespace llamado 'innova-payments'. En Etapa 2, refactoreamos
 *   a paymentsRepo, que usa el namespace 'payments'. Los pagos históricos
 *   quedaron huérfanos — ninguna function nueva los lee.
 *
 *   Este script los copia al namespace nuevo, adaptándolos al schema actual
 *   (agrega `provider`, `productTitle` snapshot, normaliza campos).
 *
 * Protegida con SEED_SECRET (misma env var que usamos para el seed inicial).
 *
 * SE BORRA DESPUÉS DE USAR. No forma parte del sistema definitivo.
 *
 * Uso:
 *   curl -X POST https://innovatrabajosocial.com.ar/.netlify/functions/admin-migrate-payments \
 *     -H "X-Seed-Secret: EL_VALOR_DEL_SEED_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"dryRun": true}'
 *
 * dryRun=true (default): NO escribe, solo lista qué haría.
 * dryRun=false: hace la migración de verdad.
 *
 * Es idempotente: si un pago ya existe en 'payments', hace upsert
 * preservando createdAt original. Correr N veces da el mismo resultado.
 */

import { getStore } from '@netlify/blobs';
import * as paymentsRepo from './_lib/repositories/payments.js';
import * as productsRepo from './_lib/repositories/products.js';

const OLD_NAMESPACE = 'innova-payments';
const REQUIRED_SECRET = process.env.SEED_SECRET;

/**
 * Construye las opciones de conexión a Blobs con siteID y token explícitos.
 * Mismo patrón que usamos en _base.js.
 */
const buildBlobsOptions = () => {
  const options = {};
  if (process.env.NETLIFY_SITE_ID) {
    options.siteID = process.env.NETLIFY_SITE_ID;
  }
  if (process.env.NETLIFY_BLOBS_TOKEN) {
    options.token = process.env.NETLIFY_BLOBS_TOKEN;
  }
  return options;
};

/**
 * Devuelve el store viejo con configuración explícita.
 */
const getOldStore = () => {
  const options = buildBlobsOptions();
  return options.siteID && options.token
    ? getStore({ name: OLD_NAMESPACE, ...options })
    : getStore(OLD_NAMESPACE);
};

/**
 * Adapta un pago del schema viejo al nuevo.
 * Cambios:
 *   - Agrega `provider: 'mercadopago'` (no había en Etapa 1, todos eran MP).
 *   - Agrega `providerReference` (era `mpPreferenceId`).
 *   - Agrega `productTitle` como snapshot desde el catálogo actual.
 *   - Preserva `createdAt` original; agrega `migratedAt` como marca.
 */
const adaptPayment = async (oldPayment) => {
  // Buscar el producto en el catálogo actual para snapshot del título.
  // Si no está (por ejemplo, el producto fue desactivado), usamos slug.
  let productTitle = oldPayment.cursoSlug;
  try {
    const product = await productsRepo.findBySlug(oldPayment.cursoSlug, {
      activeOnly: false,
    });
    if (product?.title) productTitle = product.title;
  } catch (err) {
    console.warn(
      '[migrate] no se pudo resolver título de producto:',
      oldPayment.cursoSlug,
      err.message
    );
  }

  return {
    externalReference: oldPayment.externalReference,
    status: oldPayment.status,
    amount: oldPayment.amount,
    currency: oldPayment.currency || 'ARS',
    buyerEmail: oldPayment.buyerEmail || null,
    cursoSlug: oldPayment.cursoSlug,
    productTitle,
    provider: 'mercadopago',
    providerReference: oldPayment.mpPreferenceId || null,
    providerMetadata: {
      mpPreferenceId: oldPayment.mpPreferenceId || null,
      mpPaymentId: oldPayment.mpPaymentId || null,
      mpStatus: oldPayment.mpStatus || null,
      mpStatusDetail: oldPayment.mpStatusDetail || null,
    },
    // Aliases legacy para compatibilidad.
    mpPreferenceId: oldPayment.mpPreferenceId || null,
    mpPaymentId: oldPayment.mpPaymentId || null,
    mpStatus: oldPayment.mpStatus || null,
    mpStatusDetail: oldPayment.mpStatusDetail || null,
    createdAt: oldPayment.createdAt,
    approvedAt: oldPayment.approvedAt || null,
    emailSentAt: oldPayment.emailSentAt || null,
    emailId: oldPayment.emailId || null,
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
  const dryRun = payload.dryRun !== false; // por default true

  try {
    const oldStore = getOldStore();
    const { blobs } = await oldStore.list();

    const results = {
      dryRun,
      oldNamespace: OLD_NAMESPACE,
      newNamespace: 'payments',
      totalFound: blobs.length,
      migrated: [],
      skipped: [],
      errors: [],
    };

    for (const blob of blobs) {
      try {
        const oldPayment = await oldStore.get(blob.key, { type: 'json' });
        if (!oldPayment || !oldPayment.externalReference) {
          results.skipped.push({
            key: blob.key,
            reason: 'no externalReference in payload',
          });
          continue;
        }

        const adapted = await adaptPayment(oldPayment);

        if (dryRun) {
          results.migrated.push({
            key: blob.key,
            externalReference: adapted.externalReference,
            status: adapted.status,
            buyerEmail: adapted.buyerEmail,
            wouldMigrate: true,
          });
        } else {
          await paymentsRepo.insert(adapted).catch(async (err) => {
            // Si ya existe (por ejemplo, script corrido antes), hacemos upsert
            // sin sobrescribir createdAt.
            const existing = await paymentsRepo.findByReference(
              adapted.externalReference
            );
            if (existing) {
              await paymentsRepo.updateStatus(adapted.externalReference, {
                ...adapted,
                createdAt: existing.createdAt,
              });
            } else {
              throw err;
            }
          });
          results.migrated.push({
            key: blob.key,
            externalReference: adapted.externalReference,
            status: adapted.status,
            buyerEmail: adapted.buyerEmail,
          });
        }
      } catch (err) {
        results.errors.push({
          key: blob.key,
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
    console.error('[migrate-payments] error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};