import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import {
  getPasswordStrength,
  getPasswordStrengthLabel,
} from '../lib/validators.js';
import styles from './ResetearContrasena.module.css';

/**
 * Página para setear un password nuevo después del link de recuperación.
 *
 * Flow:
 *   1. Usuario llega desde el link del mail. Supabase procesa el token
 *      del hash automáticamente (por detectSessionInUrl: true) y crea
 *      una sesión temporal para el reset.
 *   2. Verificamos que haya sesión. Si no, mostramos error (token
 *      expirado o inválido).
 *   3. Usuario ingresa nueva password + confirmación.
 *   4. Llamamos a supabase.auth.updateUser({ password }).
 *   5. Redirect a /contrasena-actualizada.
 */
function ResetearContrasena() {
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordScore = useMemo(() => getPasswordStrength(password), [password]);
  const passwordLabel = getPasswordStrengthLabel(passwordScore);

  // Verificar sesión al montar
  useEffect(() => {
    // Le damos tiempo a Supabase para procesar el token del hash de la URL
    const timer = setTimeout(async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        setValidSession(false);
      } else {
        setValidSession(true);
      }
      setChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const errors = useMemo(() => {
    const e = {};
    if (touched.password && password.length < 8) {
      e.password = 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (touched.passwordConfirm && password !== passwordConfirm) {
      e.passwordConfirm = 'Las contraseñas no coinciden.';
    }
    return e;
  }, [password, passwordConfirm, touched]);

  const canSubmit = password.length >= 8 && password === passwordConfirm && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, passwordConfirm: true });
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      navigate('/contrasena-actualizada');
    } catch (err) {
      console.error('[ResetearContrasena] error:', err);
      const msg = String(err.message || '').toLowerCase();
      if (msg.includes('should be different')) {
        setError('La nueva contraseña debe ser diferente a la anterior.');
      } else if (msg.includes('weak') || msg.includes('short')) {
        setError('La contraseña es demasiado débil. Probá con una más segura.');
      } else {
        setError('No pudimos actualizar tu contraseña. Intentá de nuevo o pedí un link nuevo.');
      }
      setLoading(false);
    }
  };

  // Estado de carga inicial
  if (checking) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.spinner} aria-hidden="true" />
            <p className={styles.description}>Verificando tu link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Link inválido o expirado
  if (!validSession) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={`${styles.iconWrap} ${styles.iconError}`} aria-hidden="true">
              <XCircle size={40} />
            </div>
            <h1 className={styles.title}>Link inválido o expirado</h1>
            <p className={styles.description}>
              Este link ya no es válido. Puede que haya expirado o que ya lo hayas usado.
            </p>
            <p className={styles.description}>
              Podés pedir uno nuevo desde la pantalla de recuperación.
            </p>
            <div className={styles.actions}>
              <Link to="/recuperar-contrasena" className={styles.primaryBtn}>
                Pedir link nuevo
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Formulario de nueva contraseña
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconWrap} aria-hidden="true">
            <Lock size={40} />
          </div>
          <h1 className={styles.title}>Nueva contraseña</h1>
          <p className={styles.subtitle}>Elegí una contraseña segura para tu cuenta.</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Contraseña</label>
              <div className={styles.passwordWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                  className={errors.password ? `${styles.input} ${styles.inputError}` : styles.input}
                  disabled={loading}
                  autoComplete="new-password"
                  minLength={8}
                  required
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

              {password && (
                <div className={styles.passwordStrength}>
                  <div className={styles.strengthBar}>
                    <div
                      className={`${styles.strengthFill} ${styles[`strength${passwordScore}`]}`}
                      style={{ width: `${(passwordScore / 4) * 100}%` }}
                    />
                  </div>
                  <p className={styles.strengthLabel}>
                    Fuerza: <strong>{passwordLabel}</strong>
                  </p>
                </div>
              )}

              {errors.password && <p className={styles.fieldError}>{errors.password}</p>}
              <p className={styles.hint}>Mínimo 8 caracteres. Recomendamos combinar mayúsculas, números y símbolos.</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="passwordConfirm" className={styles.label}>Confirmar contraseña</label>
              <div className={styles.passwordWrap}>
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, passwordConfirm: true }))}
                  className={errors.passwordConfirm ? `${styles.input} ${styles.inputError}` : styles.input}
                  disabled={loading}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((v) => !v)}
                  className={styles.passwordToggle}
                  aria-label={showPasswordConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showPasswordConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              {errors.passwordConfirm && <p className={styles.fieldError}>{errors.passwordConfirm}</p>}
            </div>

            {error && (
              <p className={styles.submitError} role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className={styles.submitBtn}
            >
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetearContrasena;