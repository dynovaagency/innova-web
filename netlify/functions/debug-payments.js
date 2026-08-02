/**
 * GET /.netlify/functions/debug-payments?secret=xxx
 *
 * TEMPORAL: lista todos los pagos en el store para debugging.
 * SE BORRA DESPUÉS DE USAR.
 */

import * as paymentsRepo from './_lib/repositories/payments.js';

export const handler = async (event) => {
  const secret =
    event.queryStringParameters?.secret ||
    event.headers['x-seed-secret'] ||
    event.headers['X-Seed-Secret'];

  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const all = await paymentsRepo.findAll({});
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        {
          count: all.length,
          payments: all.map((p) => ({
            externalReference: p.externalReference,
            status: p.status,
            buyerEmail: p.buyerEmail,
            cursoSlug: p.cursoSlug,
            productTitle: p.productTitle,
            provider: p.provider,
            createdAt: p.createdAt,
            approvedAt: p.approvedAt,
            emailSentAt: p.emailSentAt,
          })),
        },
        null,
        2
      ),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};