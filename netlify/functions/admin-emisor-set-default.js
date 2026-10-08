/**
 * POST /.netlify/functions/admin-emisor-set-default
 *
 * Marca un emisor como el emisor por defecto: el que factura los
 * productos que no tienen un emisor asignado. Protegido con requireAdmin.
 *
 * Body: { id: string }
 * Response: { emisor }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import { findEmisorById, getSupabase, toApiEmisor } from './_lib/fiscal.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }
  if (!body.id) return error(400, 'id es requerido');

  try {
    const target = await findEmisorById(body.id);
    if (!target || !target.active) return error(404, 'Emisor no encontrado');
    if (target.is_default) return ok({ emisor: toApiEmisor(target) });

    const supabase = getSupabase();

    // El índice único exige sacar el default anterior antes de poner el nuevo.
    const { error: clearError } = await supabase
      .from('emisores')
      .update({ is_default: false })
      .eq('is_default', true);
    if (clearError) throw clearError;

    const { data, error: setError } = await supabase
      .from('emisores')
      .update({ is_default: true })
      .eq('id', target.id)
      .select()
      .single();
    if (setError) throw setError;

    console.log('[admin-emisor-set-default]', { cuit: data.cuit, admin: auth.admin.email });
    return ok({ emisor: toApiEmisor(data) });
  } catch (err) {
    console.error('[admin-emisor-set-default] error:', err);
    return error(500, 'No se pudo cambiar el emisor por defecto', { details: err.message });
  }
};
