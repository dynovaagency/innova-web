/**
 * GET /.netlify/functions/admin-payments-list
 *
 * Devuelve pagos paginados con filtros. Protegido con requireAdmin.
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - pageSize: cantidad por página (default: 20, max: 100)
 *   - status: 'approved' | 'pending' | 'rejected' | undefined (todos)
 *   - cursoSlug: filtra por curso
 *   - email: substring case-insensitive del buyerEmail
 *   - externalReference: match exacto
 *   - dateFrom: ISO date, incluye pagos desde ese día
 *   - dateTo: ISO date, incluye pagos hasta ese día (inclusive)
 *
 * Response:
 *   {
 *     payments: [ ...pagos filtrados y ordenados por fecha desc... ],
 *     pagination: {
 *       page, pageSize, total, totalPages,
 *     },
 *     filters: { ...eco de los filtros aplicados... }
 *   }
 *
 * Nota sobre performance:
 *   Como Netlify Blobs no tiene índices, el filtrado se hace en memoria
 *   sobre todo el store. Al volumen actual (<500 pagos) es aceptable.
 *   En Fase 3 con Postgres, este endpoint se traduce directo a un SELECT
 *   con WHERE dinámico y LIMIT/OFFSET.
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Comparación case-insensitive para strings.
 */
const includesCI = (haystack, needle) => {
  if (!haystack || !needle) return false;
  return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
};

/**
 * Parseo defensivo de fechas ISO. Devuelve null si el string es inválido.
 */
const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Compara fechas ISO. Devuelve true si `pagoDate` (ISO) está en el rango
 * [dateFrom, dateTo]. Los límites del rango son inclusivos y ampliados
 * para cubrir el día completo (dateTo incluye hasta 23:59:59).
 */
const isInDateRange = (pagoIsoDate, dateFrom, dateTo) => {
  if (!pagoIsoDate) return false;
  const pagoTs = new Date(pagoIsoDate).getTime();
  if (isNaN(pagoTs)) return false;
  if (dateFrom && pagoTs < dateFrom.getTime()) return false;
  if (dateTo) {
    // Extender dateTo al final del día
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    if (pagoTs > endOfDay.getTime()) return false;
  }
  return true;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  const q = event.queryStringParameters || {};

  // Parseo de paginación
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  let pageSize = parseInt(q.pageSize, 10) || DEFAULT_PAGE_SIZE;
  pageSize = Math.max(1, Math.min(pageSize, MAX_PAGE_SIZE));

  // Parseo de filtros
  const status = q.status || null;
  const cursoSlug = q.cursoSlug || null;
  const email = q.email ? q.email.trim() : null;
  const externalReference = q.externalReference ? q.externalReference.trim() : null;
  const dateFrom = parseDate(q.dateFrom);
  const dateTo = parseDate(q.dateTo);

  try {
    // Traer todos los pagos y filtrar en memoria (aceptable al volumen actual)
    const allPayments = await paymentsRepo.findAll({});

    // Aplicar filtros
    let filtered = allPayments;

    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }
    if (cursoSlug) {
      filtered = filtered.filter((p) => p.cursoSlug === cursoSlug);
    }
    if (email) {
      filtered = filtered.filter((p) => includesCI(p.buyerEmail, email));
    }
    if (externalReference) {
      filtered = filtered.filter(
        (p) => p.externalReference === externalReference
      );
    }
    if (dateFrom || dateTo) {
      filtered = filtered.filter((p) =>
        isInDateRange(p.createdAt, dateFrom, dateTo)
      );
    }

    // Ordenar por fecha descendente (más recientes primero)
    filtered.sort((a, b) => {
      const aTs = new Date(a.createdAt).getTime() || 0;
      const bTs = new Date(b.createdAt).getTime() || 0;
      return bTs - aTs;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIndex = (page - 1) * pageSize;
    const pagePayments = filtered.slice(startIndex, startIndex + pageSize);

    // Aliviar el payload: no mandamos providerMetadata en el listado
    // (puede ser grande y no se usa en la tabla). Se ve en el detalle.
    const lightPayments = pagePayments.map(
      ({ providerMetadata, ...rest }) => rest
    );

    return ok({
      payments: lightPayments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      filters: {
        status,
        cursoSlug,
        email,
        externalReference,
        dateFrom: dateFrom ? dateFrom.toISOString() : null,
        dateTo: dateTo ? dateTo.toISOString() : null,
      },
    });
  } catch (err) {
    console.error('[admin-payments-list] error:', err);
    return error(500, 'No se pudo obtener el listado de pagos', {
      details: err.message,
    });
  }
};