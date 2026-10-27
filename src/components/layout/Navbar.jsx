import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, UserCircle, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import LoginModal from '../auth/LoginModal.jsx';
import styles from './Navbar.module.css';

const navItems = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/quienes-somos', label: 'INNOVA' },
  {
    to: '/servicios',
    label: 'Servicios',
    hasDropdown: true,
    dropdown: [
      { to: '/servicios/capsulas', label: 'Cápsulas' },
      { to: '/servicios', label: 'Supervisiones' },
      { to: '/servicios/cursos', label: 'Cursos y Formaciones' },
    ],
  },
  { to: '/biblioteca', label: 'Biblioteca' },
];

function LogoMark({ size = 32 }) {
  return (
    <svg viewBox="0 0 60 50" width={size * 1.2} height={size} fill="none" aria-hidden="true">
      <path
        d="M22 4 H53 a3 3 0 0 1 3 3 V26 a3 3 0 0 1 -3 3 H44 l-2 6 -4 -6 H22 a3 3 0 0 1 -3 -3 V7 a3 3 0 0 1 3 -3 z"
        stroke="#82C6C5"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="rgba(21, 63, 113, 0.5)"
      />
      <path
        d="M5 16 H38 a3 3 0 0 1 3 3 V40 a3 3 0 0 1 -3 3 H20 l-6 5 0 -5 H5 a3 3 0 0 1 -3 -3 V19 a3 3 0 0 1 3 -3 z"
        stroke="#F04847"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Barra de navegación del sitio público.
 *
 * En escritorio muestra los links en línea (Servicios con submenú al
 * pasar el mouse). Hasta 1024px los links se esconden y aparece el botón
 * de menú (hamburguesa), que despliega un panel con todas las secciones,
 * los submenús de Servicios a la vista y el botón de Inscripción.
 */
function Navbar() {
  const { user, profile, loading, signOut } = useAuthContext();
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const menuRef = useRef(null);

  // El menú mobile se cierra al navegar a otra página.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Con el menú mobile abierto: Escape lo cierra y la página de fondo no
  // scrollea. Si la pantalla se agranda a escritorio, se cierra solo.
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 1025px)');
    const handleResize = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    desktop.addEventListener('change', handleResize);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
      desktop.removeEventListener('change', handleResize);
    };
  }, [mobileOpen]);

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  // Cerrar el dropdown con Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [userMenuOpen]);

  const handleGoToProfile = () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    // Los admins y superadmins van al panel de administración.
    // Los usuarios comunes van a su panel de alumno.
    if (profile?.role === 'admin' || profile?.role === 'superadmin') {
      navigate('/admin');
    } else {
      navigate('/mi-cuenta');
    }
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    try {
      await signOut();
      // No hace falta navegar — Supabase actualiza el user a null y
      // el navbar re-renderiza mostrando "Ingresar" automáticamente.
    } catch (err) {
      console.error('[Navbar] error signOut:', err);
    }
  };

  // Nombre a mostrar en el dropdown (si tenemos profile, usar nombre;
  // si no, usar el email antes del @).
  const displayName = profile?.nombre || user?.email?.split('@')[0] || 'Usuario';

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link to="/" className={styles.brand} aria-label="Innova Trabajo Social — Inicio">
            <LogoMark size={36} />
            <span className={styles.brandText}>
              INNOVA
              <span className={styles.brandTagline}>TRABAJO SOCIAL</span>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Navegación principal">
            <ul className={styles.list}>
              {navItems.map((item) => (
                <li key={item.to} className={item.hasDropdown ? styles.hasDropdown : ''}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      isActive ? `${styles.link} ${styles.linkActive}` : styles.link
                    }
                  >
                    {item.label}
                    {item.hasDropdown && (
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </NavLink>
                  {item.hasDropdown && (
                    <ul className={styles.dropdown}>
                      {item.dropdown.map((sub) => (
                        <li key={sub.to}>
                          <Link to={sub.to} className={styles.dropdownLink}>
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <Link to="/inscripcion" className={styles.inscripcionBtn}>
              Inscripción
            </Link>

            {!loading && (
              user ? (
                <div className={styles.userMenu} ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className={styles.authBtn}
                    aria-haspopup="true"
                    aria-expanded={userMenuOpen}
                  >
                  <UserCircle size={18} aria-hidden="true" />
                    <span className={styles.authLabel}>
                      {(profile?.role === 'admin' || profile?.role === 'superadmin') ? 'Mi cuenta' : 'Tu Perfil'}
                    </span>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={userMenuOpen ? styles.chevronOpen : styles.chevron}
                    />
                  </button>

                  {userMenuOpen && (
                    <div className={styles.userDropdown} role="menu">
                      <div className={styles.userInfo}>
                        <p className={styles.userGreeting}>Hola, {displayName}</p>
                        {user.email && (
                          <p className={styles.userEmail}>{user.email}</p>
                        )}
                      </div>
                      <div className={styles.userDropdownDivider} />
                      <button
                        type="button"
                        onClick={handleGoToProfile}
                        className={styles.userDropdownItem}
                        role="menuitem"
                      >
                      <UserCircle size={16} aria-hidden="true" />
                        {(profile?.role === 'admin' || profile?.role === 'superadmin') ? 'Ir al panel admin' : 'Ir a mi cuenta'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className={`${styles.userDropdownItem} ${styles.userDropdownItemDanger}`}
                        role="menuitem"
                      >
                        <LogOut size={16} aria-hidden="true" />
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setLoginOpen(true);
                  }}
                  className={styles.authBtn}
                  aria-label="Ingresar"
                >
                <LogIn size={18} aria-hidden="true" />
                  <span className={styles.authLabel}>Ingresar</span>
                </button>
              )
            )}

            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => {
                setUserMenuOpen(false);
                setMobileOpen((v) => !v);
              }}
              aria-expanded={mobileOpen}
              aria-controls="menu-mobile"
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <>
            <div
              className={styles.mobileBackdrop}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <nav id="menu-mobile" className={styles.mobileMenu} aria-label="Menú principal">
              <ul className={styles.mobileList}>
                {navItems.map((item) => (
                  <li key={item.to}>
                    {item.hasDropdown ? (
                      <>
                        <p className={styles.mobileGroupLabel}>{item.label}</p>
                        <ul className={styles.mobileSubList}>
                          {item.dropdown.map((sub) => (
                            <li key={sub.label}>
                              <NavLink
                                to={sub.to}
                                end
                                className={({ isActive }) =>
                                  isActive
                                    ? `${styles.mobileLink} ${styles.mobileSubLink} ${styles.mobileLinkActive}`
                                    : `${styles.mobileLink} ${styles.mobileSubLink}`
                                }
                                onClick={() => setMobileOpen(false)}
                              >
                                {sub.label}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          isActive ? `${styles.mobileLink} ${styles.mobileLinkActive}` : styles.mobileLink
                        }
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
              <Link
                to="/inscripcion"
                className={styles.mobileCta}
                onClick={() => setMobileOpen(false)}
              >
                Inscripción
              </Link>
            </nav>
          </>
        )}
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

export default Navbar;