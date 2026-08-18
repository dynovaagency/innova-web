/**
 * GET /.netlify/functions/admin-dashboard-stats
 *
 * Devuelve KPIs del dashboard del panel admin. Protegido con requireAdmin.
 *
 * Response:
 *   {
 *     kpis: {
 *       currentMonth: { revenue, count, currency },
 *       previousMonth: { revenue, count, currency },
 *       total: { revenue, count, currency },
 *       revenueDelta: number | null,   // ratio: 0.15 = +15%
 *       countDelta: number | null,
 *     },
 *     recentPayments: [
 *       { externalReference, buyerEmail, productTitle, amount, currency, approvedAt }
 *     ],
 *     coursesDistribution: [
 *       { cursoSlug, productTitle, currentMonthCount, currentMonthRevenue, currency }
 *     ]
 *   }
 *
 * Implementación:
 *   - Un solo escaneo del store payments (via paymentsRepo.findAll).
 *   - Filtramos por status='approved' y agrupamos en memoria.
 *   - Para el volumen actual (~50-500 pagos) es más que suficiente.
 *   - Cuando el volumen escale, se puede agregar cache o migrar a Postgres
 *     con queries agregadas.
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import * as productsRepo from './_lib/repositories/products.js';

/**
 * Devuelve el primer día del mes de una fecha ISO (para comparar).
 * Ejemplo: '2026-08-15' → '2026-08'
 */
const monthKey = (isoString) => {
  if (!isoString) return null;
  return isoString.slice(0, 7); // 'YYYY-MM'
};

/**
 * Calcula el mes anterior en formato 'YYYY-MM'.
 * Ejemplo: '2026-08' → '2026-07'; '2026-01' → '2025-12'
 */
const previousMonthKey = (currentKey) => {
  const [year, month] = currentKey.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
};

/**
 * Calcula ratio de cambio entre valores. Devuelve null si el previo era 0.
 */
const computeDelta = (current, previous) => {
  if (previous === 0 || previous === null) return null;
  return (current - previous) / previous;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  try {
    const allPayments = await paymentsRepo.findAll({});
    const approvedPayments = allPayments.filter((p) => p.status === 'approved');

    const now = new Date();
    const currentKey = monthKey(now.toISOString());
    const previousKey = previousMonthKey(currentKey);

    // Agrupar por mes y por curso.
    const byMonth = {}; // { 'YYYY-MM': { revenue, count } }
    const byCourse = {}; // { slug: { title, currentMonthCount, currentMonthRevenue } }
    let totalRevenue = 0;
    let totalCount = 0;
    let dominantCurrency = 'ARS';

    for (const p of approvedPayments) {
      const amount = Number(p.amount) || 0;
      const key = monthKey(p.approvedAt || p.createdAt);
      const currency = p.currency || 'ARS';

      totalRevenue += amount;
      totalCount += 1;

      if (!byMonth[key]) byMonth[key] = { revenue: 0, count: 0 };
      byMonth[key].revenue += amount;
      byMonth[key].count += 1;

      if (key === currentKey && p.cursoSlug) {
        if (!byCourse[p.cursoSlug]) {
          byCourse[p.cursoSlug] = {
            cursoSlug: p.cursoSlug,
            productTitle: p.productTitle || p.cursoSlug,
            currentMonthCount: 0,
            currentMonthRevenue: 0,
            currency,
          };
        }
        byCourse[p.cursoSlug].currentMonthCount += 1;
        byCourse[p.cursoSlug].currentMonthRevenue += amount;
      }
    }

    const currentMonth = byMonth[currentKey] || { revenue: 0, count: 0 };
    const previousMonth = byMonth[previousKey] || { revenue: 0, count: 0 };

    const revenueDelta = computeDelta(currentMonth.revenue, previousMonth.revenue);
    const countDelta = computeDelta(currentMonth.count, previousMonth.count);

    // Últimas 5 compras aprobadas.
    const recentPayments = approvedPayments
      .filter((p) => p.approvedAt)
      .sort((a, b) => (a.approvedAt < b.approvedAt ? 1 : -1))
      .slice(0, 5)
      .map((p) => ({
        externalReference: p.externalReference,
        buyerEmail: p.buyerEmail,
        productTitle: p.productTitle || p.cursoSlug,
        amount: p.amount,
        currency: p.currency || 'ARS',
        approvedAt: p.approvedAt,
      }));

    // Enriquecer distribución por curso con productos activos que aún no
    // tuvieron ventas este mes.
    const activeProducts = await productsRepo.findAll({ activeOnly: true });
    for (const product of activeProducts) {
      if (!byCourse[product.slug]) {
        byCourse[product.slug] = {
          cursoSlug: product.slug,
          productTitle: product.title,
          currentMonthCount: 0,
          currentMonthRevenue: 0,
          currency: product.currency || 'ARS',
        };
      }
    }

    const coursesDistribution = Object.values(byCourse).sort(
      (a, b) => b.currentMonthCount - a.currentMonthCount
    );

    return ok({
      kpis: {
        currentMonth: { ...currentMonth, currency: dominantCurrency },
        previousMonth: { ...previousMonth, currency: dominantCurrency },
        total: { revenue: totalRevenue, count: totalCount, currency: dominantCurrency },
        revenueDelta,
        countDelta,
      },
      recentPayments,
      coursesDistribution,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[admin-dashboard-stats] error:', err);
    return error(500, 'No se pudieron calcular las estadísticas', {
      details: err.message,
    });
  }
};