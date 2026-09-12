/**
 * POST /.netlify/functions/user-purchases
 *
 * Devuelve las compras aprobadas del usuario por email match.
 *
 * Body:
 *   { email: string }
 *
 * Response:
 *   200 { purchases: [{ externalReference, productTitle, cursoSlug,
 *                       amount, currency, approvedAt, createdAt,
 *                       contentType, contentUrl, imageUrl, modalidad }] }
 *
 * TODO Fase 6: cuando linkeamos compras a user_id, cambiar el match por id
 * en vez de email.
 */

import { ok, error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import * as productsRepo from './_lib/repositories/products.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { email } = payload;
  if (!email || typeof email !== 'string') {
    return error(400, 'email es requerido');
  }

  try {
    // Buscar todas las compras aprobadas por email match
    const approved = await paymentsRepo.findApprovedByEmail(email);

    // Enriquecer cada pago con datos del producto (imagen, URL, etc)
    const purchases = await Promise.all(
      approved.map(async (p) => {
        let productData = {};
        if (p.cursoSlug) {
          const product = await productsRepo.findBySlug(p.cursoSlug, { activeOnly: false });
          if (product) {
            productData = {
              productTitle: product.title,
              imageUrl: product.imageUrl,
              contentType: product.contentType,
              contentUrl: product.contentUrl,
              modalidad: product.modalidad,
              category: product.category,
              duration: product.duration,
            };
          }
        }

        return {
          externalReference: p.externalReference,
          cursoSlug: p.cursoSlug,
          amount: p.amount,
          currency: p.currency || 'ARS',
          approvedAt: p.approvedAt,
          createdAt: p.createdAt,
          provider: p.provider,
          ...productData,
        };
      })
    );

    return ok({ purchases });
  } catch (err) {
    console.error('[user-purchases] error:', err);
    return error(500, 'No se pudieron cargar las compras', {
      details: err.message,
    });
  }
};