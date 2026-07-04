import { Link, useSearchParams } from 'react-router-dom';
import styles from './PagoEstado.module.css';

/**
 * Página a la que MP redirige cuando el pago quedó pending (ej: pago con
 * Rapipago/PagoFácil, transferencia bancaria, etc). El acceso se libera
 * cuando el pago se acredite y llegue el webhook.
 */
function PagoPendiente() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.icon} ${styles.iconPending}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1 className={styles.title}>Tu pago está siendo procesado</h1>
        <p className={styles.description}>
          Recibimos tu pago pero Mercado Pago todavía no lo confirmó. Esto puede tardar
          desde algunos minutos hasta 48 horas dependiendo del medio elegido (efectivo,
          transferencia, etc).
        </p>
        <p className={styles.description}>
          Vamos a enviarte un email cuando el pago esté acreditado, con el link para
          acceder a la cápsula.
        </p>
        {ref && (
          <p className={styles.reference}>
            Referencia de tu pago: <code>{ref}</code>
          </p>
        )}
        <Link to="/" className={styles.backBtn}>Volver al inicio</Link>
      </div>
    </div>
  );
}

export default PagoPendiente;
