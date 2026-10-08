/**
 * GET /.netlify/functions/admin-emisores-list
 *
 * Lista los emisores activos, para elegir quién factura cada producto.
 * Protegido con requireAdmin.
 *
 * Response: { emisores: [{ id, razonSocial, cuit, condicionFiscal,
 *                          isDefault, ready, missing, ... }] }
 *
 * No incluye claves, pedidos ni certificados.
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import { getSupabase, toApiEmisor } from './_lib/fiscal.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  try {
    const { data, error: listError } = await getSupabase()
      .from('emisores')
      .select('*')
      .eq('active', true)
      .order('razon_social', { ascending: true });
    if (listError) throw listError;

    return ok({ emisores: (data || []).map((row) => toApiEmisor(row)) });
  } catch (err) {
    console.error('[admin-emisores-list] error:', err);
    return error(500, 'No se pudieron cargar los emisores', { details: err.message });
  }
};
