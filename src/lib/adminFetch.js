import { supabase } from './supabase.js';

/**
 * fetch para el panel admin: agrega el token de Supabase del usuario
 * logueado en el header Authorization.
 *
 * Misma firma que fetch. Ignora `credentials` (ya no usamos cookies
 * para autenticar admins).
 */
export async function adminFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  // eslint-disable-next-line no-unused-vars
  const { credentials, headers, ...rest } = options;
  const finalHeaders = new Headers(headers || {});

  if (session?.access_token) {
    finalHeaders.set('Authorization', `Bearer ${session.access_token}`);
  }

  return fetch(url, { ...rest, headers: finalHeaders });
}