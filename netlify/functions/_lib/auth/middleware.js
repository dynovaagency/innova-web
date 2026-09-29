/**
 * Middleware requireAdmin — protege endpoints del panel admin.
 *
 * Fase 4: la autenticación de admins pasa a Supabase.
 *
 * Uso (sin cambios para los endpoints):
 *
 *   const auth = await requireAdmin(event);
 *   if (auth.error) return auth.response;
 *   const admin = auth.admin;   // { id, email, name, role }
 *
 * Chequea, en orden:
 *   1. Header Authorization: Bearer <access_token de Supabase>.
 *   2. Que el token sea válido (supabase.auth.getUser).
 *   3. Que el usuario exista en `usuarios`, esté activo y tenga
 *      role 'admin' o 'superadmin'.
 *
 * El rol solo se puede asignar desde el backend o el dashboard de
 * Supabase: los permisos por columna impiden que un usuario lo modifique.
 */

import { createClient } from '@supabase/supabase-js';
import { error } from '../config.js';

const ADMIN_ROLES = ['admin', 'superadmin'];

let _supabase = null;
const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return _supabase;
};

const unauthorized = (reason) => ({
  error: true,
  response: error(401, 'No autorizado', { reason }),
});

const forbidden = (reason) => ({
  error: true,
  response: error(403, 'No tenés permisos de administrador', { reason }),
});

export const requireAdmin = async (event) => {
  // 1. Token del header
  const header = event.headers?.authorization || event.headers?.Authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return unauthorized('no_token');
  }
  const token = header.slice(7).trim();

  const supabase = getSupabase();

  // 2. Validar token
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return unauthorized('invalid_token');
  }

  // 3. Rol en la tabla usuarios
  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select('id, email, nombre, apellido, role, active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[requireAdmin] error leyendo profile:', profileError);
    return {
      error: true,
      response: error(500, 'No se pudo verificar la sesión'),
    };
  }

  if (!profile || profile.active === false || !ADMIN_ROLES.includes(profile.role)) {
    return forbidden('not_admin');
  }

  return {
    error: false,
    admin: {
      id: profile.id,
      email: profile.email,
      name: `${profile.nombre || ''} ${profile.apellido || ''}`.trim() || profile.email,
      role: profile.role,
    },
  };
};