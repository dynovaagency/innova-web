/**
 * GET /.netlify/functions/admin-me
 *
 * Devuelve datos del admin logueado. Usado por el frontend del panel para:
 *   - Verificar que la sesión sigue viva al cargar el panel.
 *   - Mostrar nombre / email del admin en el UI.
 *
 * Si no hay sesión válida → 401. El frontend redirige a /admin/login.
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  return ok({
    admin: {
      email: auth.admin.email,
      name: auth.admin.name,
      role: auth.admin.role,
    },
    session: {
      expiresAt: auth.session.expiresAt,
    },
  });
};