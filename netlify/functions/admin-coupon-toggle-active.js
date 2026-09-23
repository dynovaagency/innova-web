/**
 * POST /.netlify/functions/admin-coupon-toggle-active
 *
 * Activa o desactiva un cupón (soft delete). Protegido con requireAdmin.
 * Body: { id: string, active: boolean }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import { getSupabase, toApiCoupon } from './_lib/coupons.js';

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

  const { id, active } = body;
  if (!id) return error(400, 'id es requerido');
  if (typeof active !== 'boolean') return error(400, 'active debe ser true o false');

  try {
    const { data, error: updateError } = await getSupabase()
      .from('cupones')
      .update({ active })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;
    if (!data) return error(404, 'Cupón no encontrado');

    console.log('[admin-coupon-toggle-active]', { code: data.code, active, admin: auth.admin.email });
    return ok({ coupon: toApiCoupon(data) });
  } catch (err) {
    console.error('[admin-coupon-toggle-active] error:', err);
    return error(500, 'No se pudo actualizar el cupón', { details: err.message });
  }
};