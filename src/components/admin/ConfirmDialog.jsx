import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

/**
 * Modal de confirmación reutilizable.
 *
 * Props:
 *   - open: boolean
 *   - title: string
 *   - message: string
 *   - confirmLabel: string. Default "Confirmar"
 *   - cancelLabel: string. Default "Cancelar"
 *   - variant: 'danger' | 'default'. Default 'default'.
 *   - loading: boolean. Deshabilita botones.
 *   - onConfirm: () => void
 *   - onCancel: () => void
 */
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={loading ? undefined : onCancel}
      role="presentation"
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${styles.iconWrap} ${styles[`iconWrap_${variant}`]}`}>
          <AlertTriangle size={22} aria-hidden="true" />
        </div>
        <div className={styles.content}>
          <h2 id="confirm-dialog-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.message}>{message}</p>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className={styles.cancelBtn}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`${styles.confirmBtn} ${styles[`confirmBtn_${variant}`]}`}
            >
              {loading ? 'Procesando...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;