/**
 * Helpers de formato compartidos en todo el panel admin.
 *
 * Centralizados acá para que un cambio de convención (formato de moneda,
 * de fecha, etc.) se aplique consistentemente en todas las vistas.
 */

/**
 * Formatea un monto como moneda internacional.
 *
 * Ejemplo: formatCurrency(28000, 'ARS') → "ARS 28,000.00"
 *          formatCurrency(1500, 'USD') → "USD 1,500.00"
 *
 * @param {number} amount - Monto en unidades enteras.
 * @param {string} currency - Código ISO de la moneda ('ARS', 'USD', etc.)
 * @returns {string}
 */
export const formatCurrency = (amount, currency = 'ARS') => {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formatea una fecha ISO como fecha corta en español.
 *
 * Ejemplo: formatDate('2026-08-06T13:24:00Z') → "6 ago 2026"
 */
export const formatDate = (isoString) => {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return '—';
  }
};

/**
 * Formatea fecha + hora corta.
 *
 * Ejemplo: formatDateTime('2026-08-06T13:24:00Z') → "6 ago 2026, 13:24"
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '—';
  }
};

/**
 * Formatea un número con separador de miles internacional (coma).
 *
 * Ejemplo: formatNumber(1234) → "1,234"
 */
export const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US').format(n);
};

/**
 * Formatea un delta porcentual (para comparaciones mes a mes).
 *
 * Ejemplo: formatDelta(0.15) → "+15%"
 *          formatDelta(-0.08) → "-8%"
 *          formatDelta(0) → "0%"
 */
export const formatDelta = (ratio) => {
  if (ratio === null || ratio === undefined || !isFinite(ratio)) return null;
  const percent = Math.round(ratio * 100);
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent}%`;
};