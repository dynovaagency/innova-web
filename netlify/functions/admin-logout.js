/**
 * POST /.netlify/functions/admin-logout
 *
 * Cierra la sesión del admin:
 *   1. Toma la cookie de sesión.
 *   2. Extrae el sessionToken del JWT.
 *   3. Revoca la sesión del store (para que no pueda seguir usándose).
 *   4. Devuelve un Set-Cookie que borra la cookie del navegador.
 *
 * Es idempotente: si no hay cookie o no hay sesión, devuelve 200 igual
 * (borra la cookie por las dudas).
 */

import { ok, error, preflight } from './_lib/config.js';
import { parseSessionCookie, buildClearSessionCookie } from './_lib/auth/cookies.js';
import { verifySessionJwt } from './_lib/auth/jwt.js';
import * as sessionsRepo from './_lib/repositories/sessions.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const jwt = parseSessionCookie(event.headers);

  if (jwt) {
    try {
      const payload = await verifySessionJwt(jwt);
      await sessionsRepo.revoke(payload.sessionToken);
    } catch {
      // JWT inválido o expirado — igual seguimos con el logout local.
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildClearSessionCookie(),
    },
    body: JSON.stringify({ ok: true }),
  };
};