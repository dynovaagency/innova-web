import { Inbox } from 'lucide-react';
import styles from './StateComponents.module.css';

/**
 * Estado vacío. Se usa cuando una lista o tabla no tiene datos.
 *
 * Props:
 *   - icon: componente lucide opcional. Default: Inbox.
 *   - title: string opcional. Default: "No hay datos para mostrar"
 *   - message: string opcional.
 *   - action: { label, onClick } opcional. CTA para crear/importar/etc.
 */
function EmptyState({
  icon: Icon = Inbox,
  title = 'No hay datos para mostrar',
  message = 'Cuando existan registros van a aparecer acá.',
  action,
}) {
  return (
    <div className={styles.container}>
      <div className={`${styles.icon} ${styles.iconEmpty}`}>
        <Icon size={28} aria-hidden="true" />
      </div>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{message}</p>
      {action && (
        <button
          type="button"
          className={styles.action}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;