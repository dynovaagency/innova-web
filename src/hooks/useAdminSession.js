import { useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext.jsx';

const ADMIN_ROLES = ['admin', 'superadmin'];

/**
 * Sesión del admin logueado.
 *
 * Fase 4: se apoya en la sesión de Supabase (AuthContext). Ya no hay
 * magic link ni cookie propia: el admin se loguea como cualquier usuario
 * y su rol en `usuarios` define si puede entrar al panel.
 *
 * Interfaz sin cambios:
 *   const { admin, loading, error, refetch, logout } = useAdminSession();
 *
 * admin: { id, email, name, role } si el usuario es admin/superadmin activo.
 *        null en cualquier otro caso.
 */
function useAdminSession() {
  const { user, profile, loading, profileLoading, signOut } = useAuthContext();

  // Mientras se resuelve la sesión o el perfil, seguimos "cargando"
  // para no redirigir antes de tiempo.
  const resolving = loading || profileLoading || (!!user && !profile && profileLoading !== false);

  const isAdmin =
    !!user &&
    !!profile &&
    profile.active !== false &&
    ADMIN_ROLES.includes(profile.role);

  const admin = isAdmin
    ? {
        id: profile.id,
        email: profile.email,
        name: `${profile.nombre || ''} ${profile.apellido || ''}`.trim() || profile.email,
        role: profile.role,
      }
    : null;

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[useAdminSession] logout error:', err);
    }
  }, [signOut]);

  // refetch se mantiene por compatibilidad: el perfil se refresca solo
  // con los eventos de Supabase.
  const refetch = useCallback(() => {}, []);

  return { admin, loading: resolving, error: null, refetch, logout };
}

export default useAdminSession;