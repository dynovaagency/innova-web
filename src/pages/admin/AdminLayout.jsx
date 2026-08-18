import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/admin/Sidebar.jsx';
import AdminHeader from '../../components/admin/AdminHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import useAdminSession from '../../hooks/useAdminSession.js';
import styles from './AdminLayout.module.css';

/**
 * Layout del panel admin.
 *
 * Verifica que haya sesión válida antes de renderizar. Si no hay sesión,
 * redirige a /admin/login.
 *
 * Estructura:
 *   +-----------+---------------------------+
 *   | Sidebar   | AdminHeader               |
 *   |           +---------------------------+
 *   |           |                           |
 *   |           |  Outlet (página actual)   |
 *   |           |                           |
 *   +-----------+---------------------------+
 */
function AdminLayout() {
  const navigate = useNavigate();
  const { admin, loading, error, logout } = useAdminSession();

  useEffect(() => {
    // Si no está cargando y no hay admin, no hay sesión. Redirigir.
    if (!loading && !admin && !error) {
      navigate('/admin/login', { replace: true });
    }
  }, [loading, admin, error, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  if (loading) {
    return (
      <div className={styles.fullScreen}>
        <LoadingState message="Verificando sesión..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.fullScreen}>
        <ErrorState
          title="No pudimos verificar tu sesión"
          message={error}
          action={{
            label: 'Volver al login',
            onClick: () => navigate('/admin/login', { replace: true }),
          }}
        />
      </div>
    );
  }

  if (!admin) {
    // Redirect ya disparado por el useEffect, este return es defensivo.
    return null;
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <AdminHeader admin={admin} onLogout={handleLogout} />
        <div className={styles.content}>
          <Outlet context={{ admin }} />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;