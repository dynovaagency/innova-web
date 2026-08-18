import { useEffect, useState, useCallback } from 'react';

/**
 * Verifica y expone la sesión del admin logueado.
 *
 * Estados:
 *   - loading: true mientras se verifica.
 *   - admin: { email, name, role } cuando hay sesión válida. null si no.
 *   - error: string si hubo error de red. null si todo OK.
 *
 * Uso:
 *   const { admin, loading, error, refetch, logout } = useAdminSession();
 *
 * Si `admin` es null y `loading` es false, no hay sesión → redirigir a login.
 */
function useAdminSession() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/admin-me', {
        credentials: 'include',
      });
      if (res.status === 401) {
        setAdmin(null);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      setAdmin(data.admin);
    } catch (err) {
      console.error('[useAdminSession] error:', err);
      setError(err.message || 'Error verificando sesión');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = useCallback(async () => {
    try {
      await fetch('/.netlify/functions/admin-logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('[useAdminSession] logout error:', err);
    }
    setAdmin(null);
  }, []);

  return { admin, loading, error, refetch: fetchSession, logout };
}

export default useAdminSession;