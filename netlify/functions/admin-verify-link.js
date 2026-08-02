/**
 * GET /.netlify/functions/admin-verify-link?token=xxx
 *
 * Verifica un magic link, crea la sesión activa, setea la cookie firmada,
 * y devuelve datos del admin logueado.
 *
 * Comportamiento:
 *   1. Toma el token del query string.
 *   2. Busca la sesión en el store con purpose='magic_link'.
 *   3. Si el token existe, no expiró, y no fue usado:
 *      - Marca el magic link como usado (para bloquear reuso).
 *      - Crea una sesión activa (purpose='login', 24 hs TTL).
 *      - Firma un JWT con { sub: email, sid: sessionToken }.
 *      - Setea la cookie httpOnly + Secure + SameSite=Lax.
 *      - Devuelve 200 con datos del admin.
 *   4. Si el token es inválido/expirado/usado → 401.
 *
 * El frontend (AdminVerify.jsx) llama a este endpoint tras clickear el
 * link del email. Si la respuesta es OK, redirige al usuario a /admin.
 */

import { ok, error, preflight } from './_lib/config.js';
import * as sessionsRepo from './_lib/repositories/sessions.js';
import * as adminsRepo from './_lib/repositories/admins.js';
import { signSessionJwt } from './_lib/auth/jwt.js';
import { buildSessionCookie } from './_lib/auth/cookies.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return error(405, 'Method not allowed');
  }

  const token =
    event.queryStringParameters?.token ||
    (event.body ? JSON.parse(event.body).token : null);

  if (!token) {
    return error(400, 'Token requerido');
  }

  // 1. Buscar magic link válido (no expirado, no usado).
  const magicLink = await sessionsRepo.findByToken(token);
  if (!magicLink || magicLink.purpose !== 'magic_link') {
    return error(401, 'Link inválido o expirado');
  }

  // 2. Verificar que el admin sigue autorizado (podría haber sido revocado).
  const admin = await adminsRepo.findByEmail(magicLink.adminEmail);
  if (!admin) {
    return error(401, 'Cuenta no autorizada');
  }

  try {
    // 3. Marcar el magic link como usado (protección contra reuso).
    await sessionsRepo.markMagicLinkAsUsed(token);

    // 4. Crear sesión activa (24 hs por default, controlado por SESSION_TTL_MS).
    const session = await sessionsRepo.createSession(admin.email);
    const expiresAtMs = new Date(session.expiresAt).getTime();
    const maxAgeSeconds = Math.floor((expiresAtMs - Date.now()) / 1000);

    // 5. Firmar JWT con { sub, sid, exp }.
    const jwt = await signSessionJwt({
      email: admin.email,
      sessionToken: session.token,
      expiresAtMs,
    });

    // 6. Setear cookie firmada. Devolvemos el admin al frontend para que
    // pueda mostrar "bienvenido, Felix" sin necesidad de otra request.
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildSessionCookie(jwt, maxAgeSeconds),
      },
      body: JSON.stringify({
        ok: true,
        admin: {
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      }),
    };
  } catch (err) {
    console.error('[admin-verify-link] error:', err);
    return error(500, 'No se pudo completar el login');
  }
};