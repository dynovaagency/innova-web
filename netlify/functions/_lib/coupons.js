/**
 * Lógica central del módulo de cupones.
 *
 * Todo el acceso a Supabase pasa por service_role (las tablas tienen
 * RLS activada sin policies, así que el frontend nunca las toca).
 *
 * Reglas de negocio:
 *   - El código se normaliza a mayúsculas sin espacios.
 *   - Un uso se registra recién cuando el pago se APRUEBA
 *     (webhook MP o aprobación manual del admin).
 *   - El límite por usuario se cuenta por email del comprador.
 *   - El descuento se aplica sobre el precio del método de pago elegido.
 *   - Por ahora no se permiten cupones que dejen el precio en $0
 *     (ver ALLOW_FREE_COUPONS).
 */

import { createClient } from '@supabase/supabase-js';

// Cuando Innova confirme cupones de beca (100%), pasar a true y sumar
// el flujo que aprueba el pago sin pasar por un medio de pago.
export const ALLOW_FREE_COUPONS = false;

const CODE_REGEX = /^[A-Z0-9_-]{3,30}$/;

let _supabase = null;
export const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return _supabase;
};

export const normalizeCode = (code) =>
  String(code || '').trim().toUpperCase().replace(/\s+/g, '');

export const isValidCodeFormat = (code) => CODE_REGEX.test(code);

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

/**
 * Precio base según el método de pago (misma regla que create-manual-payment).
 */
export const resolveMethodPrice = (product, paymentMethod) => {
  if (paymentMethod === 'transferencia' && product.priceTransferencia) {
    return product.priceTransferencia;
  }
  if (paymentMethod === 'gocuotas' && product.priceGocuotas) {
    return product.priceGocuotas;
  }
  return product.price;
};

/**
 * Calcula el descuento. Redondea a pesos enteros y nunca descuenta
 * más que el precio original.
 */
export const calculateDiscount = (coupon, originalAmount) => {
  const base = Number(originalAmount) || 0;
  const value = Number(coupon.discount_value) || 0;

  let discount =
    coupon.discount_type === 'percentage'
      ? Math.round((base * value) / 100)
      : Math.round(value);

  discount = Math.min(Math.max(discount, 0), base);

  return {
    originalAmount: base,
    discountApplied: discount,
    finalAmount: base - discount,
  };
};

/**
 * Cuenta los usos registrados de un cupón (opcionalmente filtrando por email).
 */
export const countUses = async (couponId, buyerEmail = null) => {
  let query = getSupabase()
    .from('cupones_usos')
    .select('id', { count: 'exact', head: true })
    .eq('cupon_id', couponId);

  if (buyerEmail) {
    query = query.eq('buyer_email', normalizeEmail(buyerEmail));
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

/**
 * Estado derivado del cupón, para mostrar en el panel admin.
 */
export const getCouponStatus = (coupon, usesCount = 0, now = new Date()) => {
  if (!coupon.active) return 'inactive';
  if (now < new Date(coupon.starts_at)) return 'scheduled';
  if (now >= new Date(coupon.expires_at)) return 'expired';
  if (coupon.max_uses_global && usesCount >= coupon.max_uses_global) return 'exhausted';
  return 'active';
};

const reject = (reason, message) => ({ valid: false, reason, message });

/**
 * Valida un cupón para una compra concreta.
 *
 * @returns {Promise
 *   { valid: true, coupon, originalAmount, discountApplied, finalAmount } |
 *   { valid: false, reason, message }
 * >}
 */
export const validateCoupon = async ({ code, product, paymentMethod, buyerEmail }) => {
  const normalized = normalizeCode(code);
  if (!normalized || !isValidCodeFormat(normalized)) {
    return reject('not_found', 'El código ingresado no existe.');
  }

  const { data: coupon, error } = await getSupabase()
    .from('cupones')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();

  if (error) throw error;
  if (!coupon) return reject('not_found', 'El código ingresado no existe.');

  const now = new Date();

  if (!coupon.active) {
    return reject('inactive', 'Este código ya no está disponible.');
  }
  if (now < new Date(coupon.starts_at)) {
    return reject('not_started', 'Este código todavía no está vigente.');
  }
  if (now >= new Date(coupon.expires_at)) {
    return reject('expired', 'Este código está vencido.');
  }

  const products = coupon.applicable_products || [];
  if (products.length > 0 && !products.includes(product.slug)) {
    return reject('not_applicable', 'Este código no aplica a este producto.');
  }

  if (coupon.max_uses_global) {
    const used = await countUses(coupon.id);
    if (used >= coupon.max_uses_global) {
      return reject('exhausted', 'Este código alcanzó su límite de usos.');
    }
  }

  if (coupon.max_uses_per_user) {
    if (!buyerEmail) {
      return reject('email_required', 'Ingresá tu email antes de aplicar el código.');
    }
    const usedByUser = await countUses(coupon.id, buyerEmail);
    if (usedByUser >= coupon.max_uses_per_user) {
      return reject('user_limit', 'Ya usaste este código la cantidad máxima de veces permitida.');
    }
  }

  const originalAmount = resolveMethodPrice(product, paymentMethod);
  const calc = calculateDiscount(coupon, originalAmount);

  if (calc.finalAmount <= 0 && !ALLOW_FREE_COUPONS) {
    return reject('free_not_supported', 'Este código no puede aplicarse a este producto.');
  }

  return { valid: true, coupon, ...calc };
};

/**
 * Registra el uso de un cupón cuando el pago se aprueba.
 *
 * Idempotente: payment_external_reference es UNIQUE, así que si el
 * webhook llega dos veces, el segundo insert falla con 23505 y lo ignoramos.
 *
 * Nunca lanza: un problema acá no debe bloquear la aprobación del pago.
 */
export const registerCouponUse = async (payment) => {
  if (!payment?.couponId) return { registered: false, reason: 'no_coupon' };

  try {
    const { error } = await getSupabase().from('cupones_usos').insert({
      cupon_id: payment.couponId,
      buyer_email: normalizeEmail(payment.buyerEmail),
      payment_external_reference: payment.externalReference,
      original_amount: payment.originalAmount ?? payment.amount,
      discount_applied: payment.discountApplied ?? 0,
      final_amount: payment.amount,
    });

    if (error) {
      if (error.code === '23505') {
        return { registered: false, reason: 'already_registered' };
      }
      throw error;
    }

    console.log('[coupons] uso registrado:', {
      couponCode: payment.couponCode,
      ref: payment.externalReference,
    });
    return { registered: true };
  } catch (err) {
    console.error('[coupons] error registrando uso:', err);
    return { registered: false, reason: 'error', error: err.message };
  }
};

/**
 * Convierte la fila de DB (snake_case) al formato de la API (camelCase).
 */
export const toApiCoupon = (c) => ({
  id: c.id,
  code: c.code,
  description: c.description,
  discountType: c.discount_type,
  discountValue: Number(c.discount_value),
  startsAt: c.starts_at,
  expiresAt: c.expires_at,
  maxUsesGlobal: c.max_uses_global,
  maxUsesPerUser: c.max_uses_per_user,
  applicableProducts: c.applicable_products || [],
  active: c.active,
  createdBy: c.created_by,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
});