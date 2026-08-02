import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminLogin.module.css';

/**
 * /admin (placeholder)
 *
 * Página temporal hasta que arranquemos el Sprint 2 con el panel real.
 * Verifica que haya sesión válida llamando a admin-me. Si no la hay,
 * redirige a /admin/login.
 *
 * En Sprint 2, este componente pasa a ser un layout wrapper con sidebar,
 * y las páginas hijas se renderizan como rutas anidadas.
 */

function AdminPlaceholder() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/.netlify/functions/admin-me', {
          credentials: 'include',
        });
        if (!res.ok) {
          navigate('/admin/login', { replace: true });
          return;
        }
        const data = await res.json();
        setAdmin(data.admin);
        setLoading(false);
      } catch (err) {
        console.error('[admin] error verificando sesión:', err);
        navigate('/admin/login', { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch('/.netlify/functions/admin-logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('[admin] logout error:', err);
    }
    navigate('/admin/login', { replace: true });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Cargando panel...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Panel de administración</h1>
        <p className={styles.subtitle}>
          Bienvenido/a{admin?.name ? `, ${admin.name}` : ''}.
        </p>
        <p className={styles.subtitle}>
          Este panel está en construcción. Vamos a agregar acá la gestión
          de cápsulas, pagos e inscriptos en la próxima etapa.
        </p>
        <p className={styles.subtitle} style={{ fontSize: '12px', color: '#94a3b8' }}>
          Sesión: {admin?.email} · Rol: {admin?.role}
        </p>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleLogout}
          style={{ background: '#94a3b8' }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default AdminPlaceholder;