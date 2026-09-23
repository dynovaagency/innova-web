/**
 * GET /.netlify/functions/admin-coupon-get?id=<uuid>
 *
 * Detalle de un cupón con su historial de usos. Protegido con requireAdmin.
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import { getSupabase, getCouponStatus, toApiCoupon } from './_lib/coupons.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  const id = event.queryStringParameters?.id;
  if (!id) return error(400, 'id es requerido');

  try {
    const sb = getSupabase();

    const { data: coupon, error: couponError } = await sb
      .from('cupones')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (couponError) throw couponError;
    if (!coupon) return error(404, 'Cupón no encontrado');

    const { data: usos, error: usosError } = await sb
      .from('cupones_usos')
      .select('*')
      .eq('cupon_id', id)
      .order('used_at', { ascending: false });
    if (usosError) throw usosError;

    const uses = (usos || []).map((u) => ({
      id: u.id,
      buyerEmail: u.buyer_email,
      externalReference: u.payment_external_reference,
      originalAmount: Number(u.original_amount),
      discountApplied: Number(u.discount_applied),
      finalAmount: Number(u.final_amount),
      usedAt: u.used_at,
    }));

    const totalDiscounted = uses.reduce((sum, u) => sum + u.discountApplied, 0);

    return ok({
      coupon: {
        ...toApiCoupon(coupon),
        usesCount: uses.length,
        totalDiscounted,
        status: getCouponStatus(coupon, uses.length),
      },
      uses,
    });
  } catch (err) {
    console.error('[admin-coupon-get] error:', err);
    return error(500, 'No se pudo cargar el cupón', { details: err.message });
  }
};