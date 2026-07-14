/**
 * POST /.netlify/functions/recuperar-acceso
 *
 * Recibe:
 *   { email: "usuario@example.com" }
 *
 * Devuelve:
 *   200 { found: true, cursos: [
 *          { slug, title, link, approvedAt }
 *        ] }
 *   200 { found: false }
 *
 * Nota de seguridad y UX:
 *   - Siempre 200 (incluso si no encontramos nada), para que el frontend
 *     muestre mensaje amigable.
 *   - En el frontend usamos un mensaje neutro cuando no hay resultados: no
 *     confirmamos si el email existe o no, para no filtrar quién compró qué.
 *   - Buscamos por match exacto (case-insensitive) del buyerEmail contra los
 *     registros con status 'approved'. Descartamos pending y rejected.
 */

import { SITE_URL, ok, error, preflight } from './_lib/config.js';
import { listPayments } from './_lib/store.js';

// Espejo del catálogo de títulos (idéntico al de mp-webhook.js).
// TODO: cuando llegue Fase 2, mover a un módulo compartido / DB.
const CATALOGO_TITLES = {
  'vulnerabilidad-social': 'Vulnerabilidad Social y Acumulación de Desventajas en las Trayectorias de Vida',
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const email = normalizeEmail(payload.email);
  if (!email || !email.includes('@')) {
    return error(400, 'Email inválido');
  }

  try {
    const all = await listPayments();
    const matches = all.filter(
      (p) =>
        p.status === 'approved' &&
        normalizeEmail(p.buyerEmail) === email
    );

    if (matches.length === 0) {
      return ok({ found: false });
    }

    // Deduplicar por cursoSlug: si el mismo usuario compró la misma cápsula
    // más de una vez, mostramos solo la más reciente.
    const bySlug = new Map();
    for (const p of matches) {
      const existing = bySlug.get(p.cursoSlug);
      if (!existing || new Date(p.approvedAt) > new Date(existing.approvedAt)) {
        bySlug.set(p.cursoSlug, p);
      }
    }

    const cursos = Array.from(bySlug.values()).map((p) => ({
      slug: p.cursoSlug,
      title: CATALOGO_TITLES[p.cursoSlug] || p.cursoSlug,
      link: `${SITE_URL}/curso/${p.cursoSlug}?ref=${p.externalReference}`,
      approvedAt: p.approvedAt,
    }));

    return ok({ found: true, cursos });
  } catch (err) {
    console.error('[recuperar-acceso] error:', err);
    return error(500, 'No pudimos procesar la búsqueda. Probá de nuevo en un rato.');
  }
};
