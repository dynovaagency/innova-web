import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import styles from './Toast.module.css';

/**
 * Toast de notificación. Aparece fijo abajo a la derecha.
 *
 * Props:
 *   - open: boolean. Si es false, no renderiza nada.
 *   - variant: 'success' | 'error'. Default 'success'.
 *   - title: string.
 *   - message: string opcional.
 *   - onClose: () => void. Callback para cerrar.
 *   - autoCloseMs: number opcional. Tiempo antes de auto-cerrar. Default 4000.
 *     Pasar null para no auto-cerrar.
 */
function Toast({
  open,
  variant = 'success',
  title,
  message,
  onClose,
  autoCloseMs = 4000,
}) {
  useEffect(() => {
    if (!open || autoCloseMs === null) return;
    const timer = setTimeout(() => onClose?.(), autoCloseMs);
    return () => clearTimeout(timer);
  }, [open, autoCloseMs, onClose]);

  if (!open) return null;

  const Icon = variant === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={`${styles.toast} ${styles[`toast_${variant}`]}`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <Icon size={20} className={styles.icon} aria-hidden="true" />
      <div className={styles.textBlock}>
        <p className={styles.title}>{title}</p>
        {message && <p className={styles.message}>{message}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        className={styles.closeBtn}
        aria-label="Cerrar notificación"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default Toast;