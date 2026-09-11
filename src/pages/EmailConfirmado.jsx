import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import styles from './EmailConfirmado.module.css';

/**
 * Página de aterrizaje post-confirmación de email.
 *
 * Supabase envía al usuario a esta URL después de confirmar el email.
 * El token viene en el hash de la URL y Supabase-JS lo procesa
 * automáticamente cuando la página se carga (opción detectSessionInUrl:true
 * que configuramos en supabase.js).
 *
 * Solo mostramos el estado — la confirmación real la maneja Supabase.
 */
function EmailConfirmado() {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Chequeamos si Supabase pudo confirmar la sesión
    const timer = setTimeout(async () => {
      // Buscar error en la URL (viene en el hash o query params)
      const errorParam = searchParams.get('error') || searchParams.get('error_description');
      if (errorParam) {
        setStatus('error');
        setErrorMessage(errorParam);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setStatus('error');
        setErrorMessage('No pudimos confirmar tu email. El link puede haber expirado.');
        return;
      }

      setStatus('success');
    }, 800);

    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {status === 'loading' && (
          <>
            <div className={styles.spinner} aria-hidden="true" />
            <p className={styles.description}>Confirmando tu email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={`${styles.iconWrap} ${styles.iconSuccess}`} aria-hidden="true">
              <CheckCircle size={40} />
            </div>
            <h1 className={styles.title}>¡Email confirmado!</h1>
            <p className={styles.description}>
              Tu cuenta ya está lista. Ya podés ingresar y acceder a todos nuestros contenidos.
            </p>
            <div className={styles.actions}>
              <Link to="/" className={styles.primaryBtn}>Ir al inicio</Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={`${styles.iconWrap} ${styles.iconError}`} aria-hidden="true">
              <XCircle size={40} />
            </div>
            <h1 className={styles.title}>No pudimos confirmar tu email</h1>
            <p className={styles.description}>{errorMessage}</p>
            <p className={styles.description}>
              Si el link expiró, escribinos a{' '}
              <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.link}>
                innovatrabajosocial@trabajosocial.ar
              </a>{' '}
              y te ayudamos.
            </p>
            <div className={styles.actions}>
              <Link to="/" className={styles.primaryBtn}>Volver al inicio</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EmailConfirmado;