import { AlertCircle } from 'lucide-react';
import styles from './StateComponents.module.css';

/**
 * Estado de error. Se usa cuando algo falla del lado del backend o del cliente.
 *
 * Props:
 *   - title: string opcional. Default: "Algo salió mal"
 *   - message: string opcional. Descripción del error.
 *   - action: { label, onClick } opcional. Botón de reintento.
 */
function ErrorState({
  title = 'Algo salió mal',
  message = 'No pudimos completar la operación. Probá de nuevo en unos segundos.',
  action,
}) {
  return (
    <div className={styles.container} role="alert">
      <div className={`${styles.icon} ${styles.iconError}`}>
        <AlertCircle size={28} aria-hidden="true" />
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

export default ErrorState;