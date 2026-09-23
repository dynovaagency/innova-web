/**
 * GET /.netlify/functions/admin-coupons-list
 *
 * Lista todos los cupones con cantidad de usos, total descontado
 * y estado derivado. Protegido con requireAdmin.
 * El filtrado y la búsqueda se hacen en el frontend (volumen bajo).
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import { getSupabase, getCouponStatus, toApiCoupon } from './_lib/coupons.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  try {
    const sb = getSupabase();

    const { data: coupons, error: couponsError } = await sb
      .from('cupones')
      .select('*')
      .order('created_at', { ascending: false });
    if (couponsError) throw couponsError;

    const { data: usos, error: usosError } = await sb
      .from('cupones_usos')
      .select('cupon_id, discount_applied');
    if (usosError) throw usosError;

    // Agregar usos por cupón
    const stats = {};
    for (const u of usos || []) {
      if (!stats[u.cupon_id]) stats[u.cupon_id] = { count: 0, total: 0 };
      stats[u.cupon_id].count += 1;
      stats[u.cupon_id].total += Number(u.discount_applied) || 0;
    }

    const items = (coupons || []).map((c) => {
      const s = stats[c.id] || { count: 0, total: 0 };
      return {
        ...toApiCoupon(c),
        usesCount: s.count,
        totalDiscounted: s.total,
        status: getCouponStatus(c, s.count),
      };
    });

    return ok({ coupons: items });
  } catch (err) {
    console.error('[admin-coupons-list] error:', err);
    return error(500, 'No se pudieron cargar los cupones', { details: err.message });
  }
};