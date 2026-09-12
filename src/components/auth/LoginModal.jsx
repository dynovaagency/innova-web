import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import styles from './LoginModal.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modal de login para alumnos (usuarios de rol 'user' o 'admin').
 *
 * Basado en el mock de Sebastian:
 *   - Header con "INNOVA" + botón X.
 *   - Título "Accedé a tu cuenta" + subtítulo.
 *   - Formulario: email + password (con show/hide password).
 *   - Botón "Ingresar" con ícono de flecha.
 *   - Link "¿Olvidaste tu contraseña? Recuperar acceso".
 *   - Link a página de registro.
 *
 * Estados manejados:
 *   - Loading: botón deshabilitado + texto "Ingresando...".
 *   - Error: mensaje inline debajo del formulario (color coral).
 */
function LoginModal({ open, onClose }) {
  const { signIn } = useAuthContext();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const closeRef = useRef(null);

  const emailValid = EMAIL_REGEX.test(email.trim());
  const emailShowError = emailTouched && email.length > 0 && !emailValid;
  const canSubmit = emailValid && password.length >= 6 && !loading;

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setLoading(false);
      setError('');
      setEmailTouched(false);
    }
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, loading]);

  // Focus en el botón cerrar al abrir
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => closeRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

    const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      onClose?.();

      // Después del login, verificamos el rol para redirigir.
      // No podemos usar profile del contexto acá porque acaba de cambiar
      // y todavía no se propagó. Lo buscamos directamente en la DB.
      const { supabase } = await import('../../lib/supabase.js');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('usuarios')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileData?.role === 'admin' || profileData?.role === 'superadmin') {
          navigate('/admin');
        }
        // Si es user común, se queda donde estaba (no navegamos).
      }
    } catch (err) {
      console.error('[LoginModal] error:', err);
      const message = mapErrorToSpanish(err.message);
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      onClick={loading ? undefined : onClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <p className={styles.brand}>INNOVA</p>
          <button
            type="button"
            onClick={onClose}
            ref={closeRef}
            disabled={loading}
            className={styles.closeBtn}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className={styles.body}>
          <h2 id="login-modal-title" className={styles.title}>Accedé a tu cuenta</h2>
          <p className={styles.subtitle}>Ingresá para acceder a tu espacio personalizado</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <label htmlFor="login-email" className={styles.label}>Email</label>
            <input
              id="login-email"
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

            <label htmlFor="login-password" className={styles.label}>Contraseña</label>
            <div className={styles.passwordWrap}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={styles.passwordToggle}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={styles.submitBtn}
            >
              <LogIn size={18} aria-hidden="true" />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            {error && (
              <p className={styles.errorMessage} role="alert">{error}</p>
            )}
          </form>

          <p className={styles.recoverLink}>
            ¿Olvidaste tu contraseña?{' '}
            <Link to="/recuperar-contrasena" onClick={onClose} className={styles.link}>
              Recuperar acceso
            </Link>
          </p>

          <p className={styles.registerLink}>
            ¿Aún no estás registrado?{' '}
            <Link to="/registro" onClick={onClose} className={styles.link}>
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Traduce errores comunes de Supabase Auth al español.
 * Errores fuera de esta lista se muestran genéricos.
 */
function mapErrorToSpanish(message) {
  const msg = String(message).toLowerCase();
  if (msg.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Tenés que confirmar tu email antes de ingresar. Revisá tu casilla.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Demasiados intentos. Esperá un momento y probá de nuevo.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'No pudimos conectarnos. Revisá tu conexión a internet.';
  }
  return 'No pudimos ingresar. Intentá de nuevo en unos segundos.';
}

export default LoginModal;