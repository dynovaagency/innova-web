import { LogOut } from 'lucide-react';
import styles from './AdminHeader.module.css';

/**
 * Header del panel admin.
 *
 * Props:
 *   - admin: { email, name, role }
 *   - onLogout: () => void
 */
function AdminHeader({ admin, onLogout }) {
  if (!admin) return null;

  return (
    <header className={styles.header}>
      <div className={styles.userInfo}>
        <div className={styles.userText}>
          <span className={styles.userName}>{admin.name}</span>
          <span className={styles.userEmail}>{admin.email}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className={styles.logoutBtn}
        aria-label="Cerrar sesión"
      >
        <LogOut size={16} aria-hidden="true" />
        <span>Cerrar sesión</span>
      </button>
    </header>
  );
}

export default AdminHeader;