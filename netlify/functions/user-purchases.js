/**
 * POST /.netlify/functions/user-purchases
 *
 * Devuelve las compras aprobadas del usuario AUTENTICADO.
 * El email se toma del token de Supabase, nunca del body:
 * así nadie puede consultar las compras de otra persona.
 *
 * Headers:
 *   Authorization: Bearer <supabase_access_token>
 *
 * Cada compra incluye hasInvoice: true si tiene factura electrónica
 * emitida (se descarga con /download-invoice).
 *
 * Response:
 *   200 { purchases: [...] }
 *   401 si no hay sesión válida
 *
 * TODO Fase 6: cuando linkeemos compras a user_id, buscar por id en vez de email.
 */

import { ok, error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import * as productsRepo from './_lib/repositories/products.js';
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(401, 'No autenticado');
  }
  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.email) {
    return error(401, 'Sesión inválida o expirada');
  }
  const email = userData.user.email;

  try {
    const approved = await paymentsRepo.findApprovedByEmail(email);
    const invoicedRefs = await findInvoicedRefs(
      supabase,
      approved.map((p) => p.externalReference)
    );

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
          // Solo exponemos si existe, no la ruta interna del Storage.
          hasCertificate: !!p.certificateUrl,
          certificateUploadedAt: p.certificateUploadedAt || null,
          hasInvoice: invoicedRefs.has(p.externalReference),
          ...productData,
        };
      })
    );

    return ok({ purchases });
  } catch (err) {
    console.error('[user-purchases] error:', err);
    return error(500, 'No se pudieron cargar las compras', { details: err.message });
  }
};

/**
 * Referencias de pago que tienen una factura emitida vigente.
 * Si la consulta falla, devuelve un set vacío: las compras se muestran
 * igual, solo que sin el botón de factura.
 */
async function findInvoicedRefs(supabase, refs) {
  if (refs.length === 0) return new Set();
  try {
    const { data, error: queryError } = await supabase
      .from('facturas')
      .select('payment_ref')
      .in('payment_ref', refs)
      .eq('tipo', 'factura')
      .eq('estado', 'emitida');
    if (queryError) throw queryError;
    return new Set((data || []).map((row) => row.payment_ref));
  } catch (err) {
    console.error('[user-purchases] no se pudieron leer las facturas:', err);
    return new Set();
  }
}