import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, BookOpen, User, Lock, LogOut, Home } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import styles from './UserLayout.module.css';

/**
 * Layout del panel de alumno.
 *
 * Estructura similar al AdminLayout pero adaptada:
 *   +-----------+---------------------------+
 *   | Sidebar   | Header (breadcrumb)       |
 *   |           +---------------------------+
 *   |           |                           |
 *   |           |  Outlet (página actual)   |
 *   |           |                           |
 *   +-----------+---------------------------+
 *
 * Solo accesible por usuarios con role='user'. RequireAuth se encarga
 * de que admins/superadmins sean redirigidos a /admin.
 */
function UserLayout() {
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[UserLayout] error signOut:', err);
    }
  };

  const displayName = profile?.nombre || 'Alumno/a';

  const navItems = [
    { to: '/mi-cuenta', label: 'Inicio', icon: LayoutDashboard, end: true },
    { to: '/mi-cuenta/mis-cursos', label: 'Mis cursos', icon: BookOpen },
    { to: '/mi-cuenta/perfil', label: 'Mi perfil', icon: User },
    { to: '/mi-cuenta/contrasena', label: 'Cambiar contraseña', icon: Lock },
  ];

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandText}>INNOVA</span>
            <span className={styles.brandTagline}>Mi cuenta</span>
          </Link>
        </div>

        <nav className={styles.nav} aria-label="Navegación del panel">
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                    }
                  >
                    <Icon size={18} aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link to="/" className={styles.footerLink}>
            <Home size={16} aria-hidden="true" />
            Volver al sitio
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className={styles.logoutBtn}
          >
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <p className={styles.greeting}>
              Hola, <strong>{displayName}</strong>
            </p>
            {profile?.email && (
              <p className={styles.email}>{profile.email}</p>
            )}
          </div>
        </header>
        <div className={styles.content}>
          <Outlet context={{ profile }} />
        </div>
      </div>
    </div>
  );
}

export default UserLayout;