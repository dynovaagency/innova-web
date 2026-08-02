import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './AdminLogin.module.css';

/**
 * /admin/verify
 *
 * Landing del link enviado por email. Toma el token del query string,
 * lo canjea contra admin-verify-link, y si es válido, redirige a /admin.
 *
 * El backend setea la cookie de sesión en la respuesta — este componente
 * solo dispara el fetch y navega según el resultado.
 */

const STATES = {
  LOADING: 'loading',
  ERROR: 'error',
};

function AdminVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState(STATES.LOADING);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setErrorMsg('Falta el token en el link.');
      setState(STATES.ERROR);
      return;
    }

    let cancelled = false;
    const verify = async () => {
      try {
        const res = await fetch(
          `/.netlify/functions/admin-verify-link?token=${encodeURIComponent(token)}`,
          { method: 'GET', credentials: 'include' }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Link inválido');
        }
        if (!cancelled) {
          navigate('/admin', { replace: true });
        }
      } catch (err) {
        console.error('[admin-verify] error:', err);
        if (!cancelled) {
          setErrorMsg(err.message || 'No pudimos verificar el link.');
          setState(STATES.ERROR);
        }
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {state === STATES.LOADING ? (
          <>
            <h1 className={styles.title}>Verificando acceso...</h1>
            <p className={styles.subtitle}>Un momento, por favor.</p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Ups, algo salió mal</h1>
            <p className={styles.subtitle}>{errorMsg}</p>
            <p className={styles.subtitle}>
              Los magic links vencen a los 15 minutos y solo se pueden usar
              una vez. Volvé a pedir uno nuevo desde el login.
            </p>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => navigate('/admin/login')}
            >
              Volver al login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminVerify;