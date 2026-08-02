import { useState } from 'react';
import styles from './AdminLogin.module.css';

/**
 * /admin/login
 *
 * Página de login para admins. Solo pide email; al submit dispara el envío
 * del magic link. El admin recibe el mail y clickea el link para completar
 * el login (redirige a /admin/verify con el token en el query string).
 *
 * NO se muestra si el email está autorizado o no. Siempre muestra el mismo
 * mensaje "revisá tu inbox" — la única forma de saberlo es recibir el mail
 * y clickearlo. Es protección anti-enumeración.
 */

const STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SENT: 'sent',
  ERROR: 'error',
};

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState(STATES.IDLE);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Ingresá un email válido');
      setState(STATES.ERROR);
      return;
    }

    setState(STATES.LOADING);
    setErrorMsg('');

    try {
      const res = await fetch('/.netlify/functions/admin-request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('No se pudo enviar el link');
      setState(STATES.SENT);
    } catch (err) {
      console.error('[admin-login] error:', err);
      setErrorMsg('No pudimos enviar el link. Probá de nuevo en unos minutos.');
      setState(STATES.ERROR);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Acceso al panel</h1>
        <p className={styles.subtitle}>
          Ingresá tu email. Te vamos a enviar un link para entrar.
        </p>

        {state === STATES.SENT ? (
          <div className={styles.successBox}>
            <p className={styles.successTitle}>Revisá tu inbox</p>
            <p className={styles.successBody}>
              Si el email está autorizado, en un instante vas a recibir un link
              para acceder al panel. El link vence en 15 minutos.
            </p>
            <p className={styles.successHint}>
              ¿No lo ves? Chequeá también la carpeta de spam.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@innovatrabajosocial.com.ar"
                disabled={state === STATES.LOADING}
                autoFocus
              />
            </label>

            {errorMsg && (
              <div className={styles.errorBox} role="alert">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={state === STATES.LOADING}
            >
              {state === STATES.LOADING ? 'Enviando link...' : 'Enviarme el link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminLogin;