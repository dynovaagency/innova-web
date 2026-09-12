import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext.jsx';
import styles from './RequireAuth.module.css';

/**
 * Guardian de rutas: solo renderiza los hijos si hay usuario logueado.
 *
 * Estados:
 *   - loading: muestra spinner mientras se verifica la sesión.
 *   - !user: redirige a home (el usuario puede loguearse desde el modal).
 *   - user + admin/superadmin: redirige a /admin (los admins no ven /mi-cuenta).
 *   - user + user común: renderiza el Outlet normalmente.
 *
 * Uso:
 *   <Route element={<RequireAuth />}>
 *     <Route path="/mi-cuenta" element={<UserLayout />}>
 *       ...
 *     </Route>
 *   </Route>
 */
function RequireAuth() {
  const { user, profile, loading } = useAuthContext();

  if (loading) {
    return (
      <div className={styles.fullScreen}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.message}>Verificando sesión...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Los admins van al panel de administración, no al de alumno.
  if (profile?.role === 'admin' || profile?.role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

export default RequireAuth;