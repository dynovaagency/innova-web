import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext.jsx';
import { isValidEmail } from '../lib/validators.js';
import styles from './RecuperarContrasena.module.css';

/**
 * Página para pedir un link de recuperación de contraseña.
 *
 * Flow:
 *   1. Usuario ingresa su email.
 *   2. Llamamos a supabase.auth.resetPasswordForEmail (via hook).
 *   3. Supabase manda mail con link a /resetear-contrasena?token=...
 *   4. Mostramos mensaje neutral: "Si el email está registrado, te
 *      enviamos un link" (sin confirmar/negar existencia por seguridad).
 */
function RecuperarContrasena() {
  const { resetPassword } = useAuthContext();
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const emailValid = isValidEmail(email);
  const emailShowError = emailTouched && email.length > 0 && !emailValid;
  const canSubmit = emailValid && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      console.error('[RecuperarContrasena] error:', err);
      // Aunque hubo error, mostramos mensaje neutral para no filtrar
      // información sobre si el email existe o no. Solo bloqueamos si
      // es un error de rate limit para dar feedback específico.
      const msg = String(err.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Demasiados intentos. Esperá un momento y probá de nuevo.');
      } else {
        // Cualquier otro error: igual mostramos éxito para seguridad.
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al inicio
        </Link>

        <div className={styles.card}>
          {sent ? (
            <>
              <div className={styles.iconWrap} aria-hidden="true">
                <CheckCircle size={40} />
              </div>
              <h1 className={styles.title}>Revisá tu email</h1>
              <p className={styles.description}>
                Si el email <strong>{email}</strong> está registrado en nuestra plataforma,
                te enviamos un mensaje con instrucciones para restablecer tu contraseña.
              </p>
              <p className={styles.description}>
                No olvides revisar tu casilla de spam por las dudas.
              </p>
              <div className={styles.actions}>
                <Link to="/" className={styles.primaryBtn}>Volver al inicio</Link>
              </div>
              <p className={styles.helpText}>
                ¿No te llegó nada? Escribinos a{' '}
                <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.link}>
                  innovatrabajosocial@trabajosocial.ar
                </a>
                {' '}y te ayudamos.
              </p>
            </>
          ) : (
            <>
              <header className={styles.header}>
                <div className={styles.iconWrap} aria-hidden="true">
                  <Mail size={40} />
                </div>
                <h1 className={styles.title}>Recuperar tu contraseña</h1>
                <p className={styles.subtitle}>
                  Ingresá el email de tu cuenta y te enviaremos un link para restablecerla.
                </p>
              </header>

              <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <div className={styles.field}>
                  <label htmlFor="email" className={styles.label}>Email</label>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    className={emailShowError ? `${styles.input} ${styles.inputError}` : styles.input}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                  {emailShowError && (
                    <p className={styles.fieldError}>Ingresá un email válido.</p>
                  )}
                </div>

                {error && (
                  <p className={styles.submitError} role="alert">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={styles.submitBtn}
                >
                  {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>

                <p className={styles.loginLink}>
                  ¿Ya recordaste tu contraseña?{' '}
                  <Link to="/" className={styles.link}>Iniciá sesión</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecuperarContrasena;