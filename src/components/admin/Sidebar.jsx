import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  CreditCard,
  Users,
  Settings,
} from 'lucide-react';
import styles from './Sidebar.module.css';

/**
 * Sidebar de navegación del panel admin.
 *
 * Cada ítem es un NavLink que aplica la clase `activeItem` cuando la ruta
 * matchea. Usamos la prop `end` en el home para que "Dashboard" no quede
 * activo cuando estamos en /admin/capsulas (que también empieza con /admin).
 */

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/capsulas', label: 'Cápsulas', icon: BookOpen },
  { to: '/admin/pagos', label: 'Pagos', icon: CreditCard },
  { to: '/admin/inscriptos', label: 'Inscriptos', icon: Users },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandTitle}>Innova</span>
        <span className={styles.brandSubtitle}>Panel Admin</span>
      </div>

      <nav className={styles.nav} aria-label="Navegación del panel">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive
                ? `${styles.item} ${styles.itemActive}`
                : styles.item
            }
          >
            <Icon size={18} className={styles.itemIcon} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <span className={styles.footerText}>v2.0 · Sprint 2</span>
      </div>
    </aside>
  );
}

export default Sidebar;