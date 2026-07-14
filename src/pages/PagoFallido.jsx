import { Link, useSearchParams } from 'react-router-dom';
import styles from './PagoEstado.module.css';

/**
 * Página a la que MP redirige cuando el pago fue rechazado (tarjeta rechazada,
 * saldo insuficiente, etc). Le explicamos al usuario cómo seguir.
 */
function PagoFallido() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.icon} ${styles.iconFailed}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 className={styles.title}>No pudimos procesar el pago</h1>
        <p className={styles.description}>
          Mercado Pago rechazó el pago. Puede ser por saldo insuficiente, tarjeta
          rechazada por el banco, o datos incorrectos.
        </p>
        <p className={styles.description}>
          Podés intentar de nuevo con otro medio de pago. Si el problema persiste,
          escribinos a{' '}
          <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.link}>
            innovatrabajosocial@trabajosocial.ar
          </a>{' '}
          y te ayudamos.
        </p>
        <p className={styles.description}>
          Si tu pago igual se procesó, podés recuperar el acceso a la cápsula desde{' '}
          <Link to="/recuperar-acceso" className={styles.link}>
            esta página
          </Link>.
        </p>
        {ref && (
          <p className={styles.reference}>
            Referencia de tu intento: <code>{ref}</code>
          </p>
        )}
        <div className={styles.actions}>
          <Link to="/servicios/capsula-formativa" className={styles.backBtn}>
            Volver a intentar
          </Link>
          <Link to="/" className={styles.secondaryBtn}>Ir al inicio</Link>
        </div>
      </div>
    </div>
  );
}

export default PagoFallido;
