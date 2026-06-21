import { NavLink, Link } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import styles from './Navbar.module.css';

const navItems = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/quienes-somos', label: 'INNOVA' },
  { to: '/servicios', label: 'Servicios', hasDropdown: true },
];

function LogoMark({ size = 32 }) {
  // Logo Innova sobre fondo azul: ambos bocadillos en outline + interior blanco
  return (
    <svg viewBox="0 0 60 50" width={size * 1.2} height={size} fill="none" aria-hidden="true">
      {/* Bocadillo verde sage (atrás, arriba a la derecha) */}
      <path
        d="M22 4 H53 a3 3 0 0 1 3 3 V26 a3 3 0 0 1 -3 3 H44 l-2 6 -4 -6 H22 a3 3 0 0 1 -3 -3 V7 a3 3 0 0 1 3 -3 z"
        stroke="#82C6C5"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="rgba(21, 63, 113, 0.5)"
      />
      {/* Bocadillo rojo coral (delante, abajo a la izquierda) */}
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

function Navbar() {
  return (
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
              <li key={item.to}>
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
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <Link to="/servicios/capsula-formativa" className={styles.inscripcionBtn}>
            Inscripción
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
