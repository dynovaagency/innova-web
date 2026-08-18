import { Loader2 } from 'lucide-react';
import styles from './StateComponents.module.css';

/**
 * Estado de carga. Se usa mientras un endpoint responde o mientras un dato
 * se está calculando en el cliente.
 *
 * Props:
 *   - message: string opcional. Default: "Cargando..."
 */
function LoadingState({ message = 'Cargando...' }) {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={`${styles.icon} ${styles.iconLoading}`}>
        <Loader2 size={28} className={styles.spinner} aria-hidden="true" />
      </div>
      <p className={styles.title}>{message}</p>
    </div>
  );
}

export default LoadingState;