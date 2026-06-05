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

function Navbar() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.brand}>
          <span className={styles.logoMark} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
              <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
              <path d="M7 16V8M7 8L12 13L17 8M17 8V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className={styles.brandText}>Innova</span>
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
          <Link to="/contacto" className={styles.actionLink}>
            Contacto
          </Link>
          <Button as={Link} to="/servicios" variant="primary" size="sm">
            Empezar
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
