import { NavLink, Link } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import styles from './Navbar.module.css';

const navItems = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/quienes-somos', label: 'Quiénes somos' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/orientacion', label: 'Orientación' },
  { to: '/biblioteca', label: 'Biblioteca' },
];

function LogoMark() {
  return (
    <svg viewBox="0 0 36 32" width="36" height="32" fill="none" aria-hidden="true">
      <path
        d="M2 4C2 2.9 2.9 2 4 2H22C23.1 2 24 2.9 24 4V16C24 17.1 23.1 18 22 18H10L4 24V18C2.9 18 2 17.1 2 16V4Z"
        fill="#153F71"
      />
      <path
        d="M12 14C12 12.9 12.9 12 14 12H32C33.1 12 34 12.9 34 14V24C34 25.1 33.1 26 32 26H30V30L24 26H14C12.9 26 12 25.1 12 24V14Z"
        fill="#F04847"
      />
    </svg>
  );
}

function Navbar() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.brand} aria-label="Innova Trabajo Social — Inicio">
          <LogoMark />
          <span className={styles.brandText}>INNOVA</span>
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
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <Button as={Link} to="/contacto" variant="secondary" size="sm">
            Contacto
          </Button>
          <Button as={Link} to="/servicios" variant="primary" size="sm">
            Empezar
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
