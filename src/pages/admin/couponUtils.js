import { formatCurrency } from '../../lib/format.js';

/**
 * Helpers compartidos por las páginas de cupones del panel admin.
 */

export const COUPON_STATUS = {
  active: { label: 'Activo', variant: 'success' },
  scheduled: { label: 'Programado', variant: 'warning' },
  expired: { label: 'Vencido', variant: 'neutral' },
  exhausted: { label: 'Agotado', variant: 'danger' },
  inactive: { label: 'Inactivo', variant: 'neutral' },
};

export const formatDiscount = (coupon) =>
  coupon.discountType === 'percentage'
    ? `${coupon.discountValue}%`
    : formatCurrency(coupon.discountValue, 'ARS');

export const formatUses = (coupon) =>
  coupon.maxUsesGlobal
    ? `${coupon.usesCount} / ${coupon.maxUsesGlobal}`
    : `${coupon.usesCount} / sin límite`;

export const formatShortDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatValidity = (coupon) =>
  `${formatShortDate(coupon.startsAt)} → ${formatShortDate(coupon.expiresAt)}`;

/**
 * ISO → valor para <input type="datetime-local"> (hora local del navegador).
 */
export const toLocalInputValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Valor de <input type="datetime-local"> → ISO (interpreta hora local).
 */
export const fromLocalInputValue = (value) =>
  value ? new Date(value).toISOString() : null;