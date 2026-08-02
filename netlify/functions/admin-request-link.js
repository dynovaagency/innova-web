/**
 * POST /.netlify/functions/admin-request-link
 *
 * Recibe:
 *   { email: "admin@example.com" }
 *
 * Comportamiento:
 *   1. Valida el email contra la whitelist (adminsRepo).
 *   2. Si es admin autorizado: crea un magic link (15 min TTL) y envía email
 *      con Resend.
 *   3. Si NO es admin: no revela nada. Devuelve la misma respuesta genérica.
 *      Esto es protección anti-enumeración — un atacante no puede usar este
 *      endpoint para saber qué emails son admins.
 *
 * Devuelve:
 *   200 { ok: true }  (siempre, sea admin o no)
 *
 * Nota: el frontend NUNCA debe mostrar "email no autorizado" — siempre
 * "revisá tu inbox". La única forma de saber si estás autorizado es
 * efectivamente recibir el mail y clickearlo.
 */

import { SITE_URL, ok, error, preflight } from './_lib/config.js';
import * as adminsRepo from './_lib/repositories/admins.js';
import * as sessionsRepo from './_lib/repositories/sessions.js';
import { sendMagicLink } from './_lib/email.js';

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

  // Buscamos al admin. Si no existe, devolvemos ok genérico igual (anti-enum).
  const admin = await adminsRepo.findByEmail(emailRaw);
  if (!admin) {
    console.log('[admin-request-link] email no autorizado (silent):', emailRaw);
    return ok({ ok: true });
  }

  try {
    // Crear el magic link en el store (con expiración de 15 min por default,
    // controlado por MAGIC_LINK_TTL_MS en sessions.js).
    const magicLink = await sessionsRepo.createMagicLink(admin.email);

    // Armar la URL. La página AdminVerify.jsx del frontend hace el fetch
    // al endpoint de verify-link con el token del query param.
    const magicUrl = `${SITE_URL}/admin/verify?token=${encodeURIComponent(magicLink.token)}`;

    const result = await sendMagicLink({
      to: admin.email,
      magicUrl,
      expiresAt: magicLink.expiresAt,
      name: admin.name,
    });

    if (!result.sent) {
      console.error('[admin-request-link] email no se pudo enviar:', result.error);
      // No revelamos al frontend que el mail falló. El admin va a ver que
      // no le llegó y podrá reintentar. Loguear es suficiente.
    }

    return ok({ ok: true });
  } catch (err) {
    console.error('[admin-request-link] error:', err);
    // Devolvemos ok igual para no filtrar información. El log queda.
    return ok({ ok: true });
  }
};