/**
 * GET /.netlify/functions/admin-enrollments-export
 *
 * Exporta los inscriptos filtrados como CSV. Protegido con requireAdmin.
 *
 * Query params (mismos que admin-enrollments-list, sin page/pageSize):
 *   - cursoSlug, email, dateFrom, dateTo
 *
 * Response:
 *   200 con Content-Type: text/csv y Content-Disposition attachment.
 *   El body es el CSV con encoding UTF-8 + BOM.
 *
 * Columnas:
 *   Email, Nombre del curso, Slug del curso, Fecha de compra,
 *   Fecha de aprobación, Monto, Moneda, Referencia externa
 *
 * Nota sobre BOM:
 *   Prefijamos el CSV con \uFEFF (BOM UTF-8) para que Excel y Google Sheets
 *   lo abran directamente con las tildes correctas, sin necesidad de que
 *   el usuario configure el encoding manualmente.
 */

import { error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import { resolveProductTitlesBulk } from './_lib/products/title-resolver.js';

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

/**
 * Escapa un valor para CSV. Si contiene comas, comillas o saltos de línea,
 * se envuelve en comillas dobles y las comillas internas se duplican.
 */
const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Formatea una fecha ISO para exportación en CSV (formato es-AR).
 * Ej: "07/08/2026 20:05"
 */
const formatCsvDate = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
};

/**
 * Genera el filename del CSV con curso y fecha de exportación.
 */
const buildFilename = (cursoSlug) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const cursoPart = cursoSlug ? cursoSlug : 'todos';
  return `inscriptos_${cursoPart}_${dateStr}.csv`;
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  const q = event.queryStringParameters || {};
  const cursoSlug = q.cursoSlug || null;
  const email = q.email ? q.email.trim() : null;
  const dateFrom = parseDate(q.dateFrom);
  const dateTo = parseDate(q.dateTo);

  try {
    const allPayments = await paymentsRepo.findAll({ status: 'approved' });

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

    // Ordenar por aprobación descendente
    filtered.sort((a, b) => {
      const aTs = new Date(a.approvedAt || a.createdAt).getTime() || 0;
      const bTs = new Date(b.approvedAt || b.createdAt).getTime() || 0;
      return bTs - aTs;
    });

    const titles = await resolveProductTitlesBulk(filtered);

    // Construir CSV
    const headers = [
      'Email',
      'Nombre del curso',
      'Slug del curso',
      'Fecha de compra',
      'Fecha de aprobación',
      'Monto',
      'Moneda',
      'Referencia externa',
    ];

    const rows = filtered.map((p) => [
      p.buyerEmail || '',
      titles[p.cursoSlug] || p.productTitle || p.cursoSlug || '',
      p.cursoSlug || '',
      formatCsvDate(p.createdAt),
      formatCsvDate(p.approvedAt),
      p.amount ?? '',
      p.currency || 'ARS',
      p.externalReference || '',
    ]);

    const csvLines = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) => row.map(csvEscape).join(',')),
    ];

    // BOM UTF-8 + CRLF entre líneas (compatibilidad Excel)
    const csvContent = '\uFEFF' + csvLines.join('\r\n');

    const filename = buildFilename(cursoSlug);

    console.log(
      `[admin-enrollments-export] exportando ${filtered.length} inscriptos`,
      { admin: auth.admin.email, cursoSlug: cursoSlug || 'todos' }
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
      body: csvContent,
    };
  } catch (err) {
    console.error('[admin-enrollments-export] error:', err);
    return error(500, 'No se pudo exportar el CSV', { details: err.message });
  }
};