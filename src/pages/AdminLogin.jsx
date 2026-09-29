import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LogIn, LogOut, ShieldAlert, Lock } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext.jsx';
import useAdminSession from '../hooks/useAdminSession.js';
import LoginModal from '../components/auth/LoginModal.jsx';
import styles from './AdminLogin.module.css';

/**
 * Acceso al panel de administración.
 *
 * Fase 4: ya no hay magic link. Los admins se loguean con su cuenta de
 * Supabase (email + contraseña) y el rol en `usuarios` define el acceso.
 *
 * Casos:
 *   - Admin logueado            → redirige a /admin.
 *   - Logueado sin rol de admin → aviso + opciones.
 *   - Sin sesión                → botón que abre el LoginModal.
 */
function AdminLogin() {
  const { user } = useAuthContext();
  const { admin, loading, logout } = useAdminSession();
  const [loginOpen, setLoginOpen] = useState(false);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.text}>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (admin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandTitle}>INNOVA</span>
          <span className={styles.brandSubtitle}>Panel de administración</span>
        </div>

        {user ? (
          <>
            <div className={`${styles.iconWrap} ${styles.iconWarning}`} aria-hidden="true">
              <ShieldAlert size={32} />
            </div>
            <h1 className={styles.title}>Sin permisos de administración</h1>
            <p className={styles.text}>
              La cuenta <strong>{user.email}</strong> no tiene acceso al panel.
              Si creés que es un error, contactá a un administrador.
            </p>
            <div className={styles.actions}>
              <Link to="/" className={styles.secondaryBtn}>
                Volver al sitio
              </Link>
              <button type="button" onClick={logout} className={styles.primaryBtn}>
                <LogOut size={16} aria-hidden="true" />
                Ingresar con otra cuenta
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.iconWrap} aria-hidden="true">
              <Lock size={32} />
            </div>
            <h1 className={styles.title}>Ingresá al panel</h1>
            <p className={styles.text}>
              Usá tu cuenta de Innova (email y contraseña).
            </p>
            <p className={styles.hint}>
              ¿Es tu primera vez o no recordás tu contraseña? En la ventana de ingreso
              elegí <strong>"¿Olvidaste tu contraseña?"</strong> y te enviamos un link
              para crearla.
            </p>
            <div className={styles.actions}>
              <Link to="/" className={styles.secondaryBtn}>
                Volver al sitio
              </Link>
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className={styles.primaryBtn}
              >
                <LogIn size={16} aria-hidden="true" />
                Iniciar sesión
              </button>
            </div>
          </>
        )}
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default AdminLogin;