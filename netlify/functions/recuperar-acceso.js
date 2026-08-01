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
 *
 * Refactor Entrega 4: elimina CATALOGO_TITLES local; usa paymentsRepo
 * (con normalización de email en el propio repo) y el helper compartido
 * de resolución de títulos.
 */

import { SITE_URL, ok, error, preflight } from './_lib/config.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import { resolveProductTitlesBulk } from './_lib/products/title-resolver.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const emailRaw = payload.email;
  if (!emailRaw || typeof emailRaw !== 'string' || !emailRaw.includes('@')) {
    return error(400, 'Email inválido');
  }

  try {
    // El repo normaliza el email (trim + lowercase) internamente.
    const matches = await paymentsRepo.findApprovedByEmail(emailRaw);

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

    const deduped = Array.from(bySlug.values());

    // Resolver títulos en bulk (aprovecha cache local del helper).
    const titles = await resolveProductTitlesBulk(deduped);

    const cursos = deduped.map((p) => ({
      slug: p.cursoSlug,
      title: titles.get(p.externalReference),
      link: `${SITE_URL}/curso/${p.cursoSlug}?ref=${p.externalReference}`,
      approvedAt: p.approvedAt,
    }));

    return ok({ found: true, cursos });
  } catch (err) {
    console.error('[recuperar-acceso] error:', err);
    return error(500, 'No pudimos procesar la búsqueda. Probá de nuevo en un rato.');
  }
};