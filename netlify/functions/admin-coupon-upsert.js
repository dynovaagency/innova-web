/**
 * POST /.netlify/functions/admin-coupon-upsert
 *
 * Crea (sin id) o actualiza (con id) un cupón. Protegido con requireAdmin.
 *
 * Body:
 *   { id?, code, description?, discountType: 'percentage'|'fixed',
 *     discountValue, startsAt?, expiresAt, maxUsesGlobal?, maxUsesPerUser?,
 *     applicableProducts?: string[], active? }
 *
 * Si el cupón ya tiene usos, no se pueden modificar: code, discountType,
 * discountValue ni applicableProducts (protege el historial).
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import {
  getSupabase,
  normalizeCode,
  isValidCodeFormat,
  countUses,
  toApiCoupon,
} from './_lib/coupons.js';

const parseOptionalPositiveInt = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

/**
 * Valida el body y lo convierte a una fila de DB.
 * Devuelve { errorMessage } o { row }.
 */
const buildRow = (body) => {
  const code = normalizeCode(body.code);
  if (!isValidCodeFormat(code)) {
    return { errorMessage: 'El código debe tener entre 3 y 30 caracteres: letras, números, guiones o guion bajo.' };
  }

  if (!['percentage', 'fixed'].includes(body.discountType)) {
    return { errorMessage: 'El tipo de descuento debe ser porcentaje o monto fijo.' };
  }

  const discountValue = Number(body.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { errorMessage: 'El valor del descuento debe ser mayor a cero.' };
  }
  if (body.discountType === 'percentage' && discountValue > 100) {
    return { errorMessage: 'El porcentaje no puede superar el 100%.' };
  }

  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (Number.isNaN(startsAt.getTime())) {
    return { errorMessage: 'La fecha de inicio no es válida.' };
  }
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    return { errorMessage: 'La fecha de vencimiento es obligatoria.' };
  }
  if (expiresAt <= startsAt) {
    return { errorMessage: 'La fecha de vencimiento tiene que ser posterior a la de inicio.' };
  }

  const maxUsesGlobal = parseOptionalPositiveInt(body.maxUsesGlobal);
  const maxUsesPerUser = parseOptionalPositiveInt(body.maxUsesPerUser);
  if (Number.isNaN(maxUsesGlobal) || Number.isNaN(maxUsesPerUser)) {
    return { errorMessage: 'Los límites de uso deben ser números enteros positivos (o vacíos para "sin límite").' };
  }

  const applicableProducts = Array.isArray(body.applicableProducts)
    ? body.applicableProducts.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim())
    : [];

  return {
    row: {
      code,
      description: body.description?.trim() || null,
      discount_type: body.discountType,
      discount_value: discountValue,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      max_uses_global: maxUsesGlobal,
      max_uses_per_user: maxUsesPerUser,
      applicable_products: applicableProducts,
      active: body.active !== false,
    },
  };
};

const sameProducts = (a = [], b = []) =>
  [...a].sort().join('|') === [...b].sort().join('|');

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

  const { errorMessage, row } = buildRow(body);
  if (errorMessage) return error(400, errorMessage);

  const sb = getSupabase();

  try {
    // ---------- EDICIÓN ----------
    if (body.id) {
      const { data: existing, error: findError } = await sb
        .from('cupones')
        .select('*')
        .eq('id', body.id)
        .maybeSingle();
      if (findError) throw findError;
      if (!existing) return error(404, 'Cupón no encontrado');

      const usesCount = await countUses(existing.id);
      if (usesCount > 0) {
        const lockedChanged =
          row.code !== existing.code ||
          row.discount_type !== existing.discount_type ||
          Number(row.discount_value) !== Number(existing.discount_value) ||
          !sameProducts(row.applicable_products, existing.applicable_products);

        if (lockedChanged) {
          return error(400,
            'Este cupón ya fue usado: no se puede cambiar el código, el descuento ni los productos. ' +
            'Podés modificar descripción, fechas, límites de uso y estado, o crear un cupón nuevo.'
          );
        }
      }

      const { data: updated, error: updateError } = await sb
        .from('cupones')
        .update(row)
        .eq('id', body.id)
        .select()
        .single();

      if (updateError) {
        if (updateError.code === '23505') return error(409, 'Ya existe un cupón con ese código.');
        throw updateError;
      }

      console.log('[admin-coupon-upsert] cupón actualizado:', { code: updated.code, admin: auth.admin.email });
      return ok({ coupon: toApiCoupon(updated), created: false });
    }

    // ---------- ALTA ----------
    const { data: created, error: insertError } = await sb
      .from('cupones')
      .insert({ ...row, created_by: auth.admin.email })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') return error(409, 'Ya existe un cupón con ese código.');
      throw insertError;
    }

    console.log('[admin-coupon-upsert] cupón creado:', { code: created.code, admin: auth.admin.email });
    return ok({ coupon: toApiCoupon(created), created: true });
  } catch (err) {
    console.error('[admin-coupon-upsert] error:', err);
    return error(500, 'No se pudo guardar el cupón', { details: err.message });
  }
};