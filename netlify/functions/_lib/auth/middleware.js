/**
 * Middleware requireAdmin — protege endpoints del panel admin.
 *
 * Uso en una function:
 *
 *   import { requireAdmin } from './_lib/auth/middleware.js';
 *
 *   export const handler = async (event) => {
 *     const auth = await requireAdmin(event);
 *     if (auth.error) return auth.response;   // 401 automático
 *     const admin = auth.admin;               // { email, name, role }
 *     // ...lógica del endpoint...
 *   };
 *
 * El middleware chequea, en orden:
 *   1. Hay cookie de sesión válida (JWT firmado, no expirado).
 *   2. La sesión existe en el store y no fue revocada.
 *   3. El admin del subject sigue estando activo en el store de admins.
 *
 * Si algo falla, devuelve { error: true, response: {...401...} }.
 * Si todo OK, devuelve { admin: {...} }.
 */

import { error } from '../config.js';
import { parseSessionCookie } from './cookies.js';
import { verifySessionJwt } from './jwt.js';
import * as sessionsRepo from '../repositories/sessions.js';
import * as adminsRepo from '../repositories/admins.js';

const UNAUTHORIZED = (reason) =>
  error(401, 'No autorizado', { reason });

export const requireAdmin = async (event) => {
  // 1. Extraer JWT de la cookie.
  const jwt = parseSessionCookie(event.headers);
  if (!jwt) {
    return { error: true, response: UNAUTHORIZED('no_session_cookie') };
  }

  // 2. Verificar firma y expiración del JWT.
  let payload;
  try {
    payload = await verifySessionJwt(jwt);
  } catch (err) {
    return { error: true, response: UNAUTHORIZED('invalid_jwt') };
  }

  // 3. Verificar que la sesión sigue viva en el store (no revocada).
  const session = await sessionsRepo.findByToken(payload.sessionToken);
  if (!session || session.purpose !== 'login') {
    return { error: true, response: UNAUTHORIZED('session_not_found') };
  }

  // 4. Verificar que el admin sigue estando autorizado.
  const admin = await adminsRepo.findByEmail(payload.email);
  if (!admin) {
    return { error: true, response: UNAUTHORIZED('admin_not_authorized') };
  }

  return {
    error: false,
    admin,
    session,
  };
};