/**
 * GET /.netlify/functions/admin-enrollments-list
 *
 * Devuelve inscriptos paginados con filtros. Protegido con requireAdmin.
 *
 * "Inscripto" = pago con status === 'approved'. Si en el futuro aparecen
 * inscripciones sin pago (cortesías, becados), este endpoint tendría que
 * consolidar dos fuentes.
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - pageSize: cantidad por página (default: 20, max: 100)
 *   - cursoSlug: filtra por curso ('' o ausente = todos los cursos)
 *   - email: substring case-insensitive del buyerEmail
 *   - dateFrom: ISO date, incluye inscriptos desde ese día
 *   - dateTo: ISO date, incluye hasta ese día (inclusive)
 *
 * Response:
 *   {
 *     enrollments: [
 *       { email, cursoSlug, productTitle, createdAt, approvedAt,
 *         amount, currency, externalReference }
 *     ],
 *     pagination: { page, pageSize, total, totalPages },
 *     filters: { ...eco... }
 *   }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import { resolveProductTitlesBulk } from './_lib/products/title-resolver.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const includesCI = (haystack, needle) => {
  if (!haystack || !needle) return false;
  return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
};

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const isInDateRange = (isoDate, dateFrom, dateTo) => {
  if (!isoDate) return false;
  const ts = new Date(isoDate).getTime();
  if (isNaN(ts)) return false;
  if (dateFrom && ts < dateFrom.getTime()) return false;
  if (dateTo) {
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    if (ts > endOfDay.getTime()) return false;
  }
  return true;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  const q = event.queryStringParameters || {};

  const page = Math.max(1, parseInt(q.page, 10) || 1);
  let pageSize = parseInt(q.pageSize, 10) || DEFAULT_PAGE_SIZE;
  pageSize = Math.max(1, Math.min(pageSize, MAX_PAGE_SIZE));

  const cursoSlug = q.cursoSlug || null;
  const email = q.email ? q.email.trim() : null;
  const dateFrom = parseDate(q.dateFrom);
  const dateTo = parseDate(q.dateTo);

  try {
    // Trae todos los pagos approved (la data source de inscriptos).
    const allPayments = await paymentsRepo.findAll({ status: 'approved' });

    // Aplicar filtros
    let filtered = allPayments;

    if (cursoSlug) {
      filtered = filtered.filter((p) => p.cursoSlug === cursoSlug);
    }
    if (email) {
      filtered = filtered.filter((p) => includesCI(p.buyerEmail, email));
    }
    if (dateFrom || dateTo) {
      filtered = filtered.filter((p) =>
        isInDateRange(p.approvedAt || p.createdAt, dateFrom, dateTo)
      );
    }

    // Ordenar por fecha de aprobación descendente (más recientes primero)
    filtered.sort((a, b) => {
      const aTs = new Date(a.approvedAt || a.createdAt).getTime() || 0;
      const bTs = new Date(b.approvedAt || b.createdAt).getTime() || 0;
      return bTs - aTs;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIndex = (page - 1) * pageSize;
    const pagePayments = filtered.slice(startIndex, startIndex + pageSize);

    // Resolver títulos (usa snapshot cuando existe, cae al catálogo si no)
    const titles = await resolveProductTitlesBulk(pagePayments);

    // Mapear al shape de "enrollment"
    const enrollments = pagePayments.map((p) => ({
      email: p.buyerEmail || null,
      cursoSlug: p.cursoSlug,
      productTitle: titles[p.cursoSlug] || p.productTitle || p.cursoSlug,
      createdAt: p.createdAt,
      approvedAt: p.approvedAt,
      amount: p.amount,
      currency: p.currency || 'ARS',
      externalReference: p.externalReference,
    }));

    return ok({
      enrollments,
      pagination: { page, pageSize, total, totalPages },
      filters: {
        cursoSlug,
        email,
        dateFrom: dateFrom ? dateFrom.toISOString() : null,
        dateTo: dateTo ? dateTo.toISOString() : null,
      },
    });
  } catch (err) {
    console.error('[admin-enrollments-list] error:', err);
    return error(500, 'No se pudo obtener el listado de inscriptos', {
      details: err.message,
    });
  }
};