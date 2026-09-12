import { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import {
  getPasswordStrength,
  getPasswordStrengthLabel,
} from '../../lib/validators.js';
import styles from './CambiarContrasena.module.css';

/**
 * Página para cambiar la contraseña desde el panel de usuario.
 *
 * Flow:
 *   1. Usuario ingresa contraseña actual + nueva + confirmación.
 *   2. Verificamos la actual haciendo un signIn temporal con el email
 *      del profile. Si falla, error (contraseña actual incorrecta).
 *   3. Si es correcta, llamamos updateUser({ password }) con la nueva.
 *   4. Redirect al dashboard con mensaje de éxito.
 *
 * Nota: Supabase no ofrece "verificar password sin loguear", así que
 * hacemos el workaround del signIn temporal. Como el usuario ya tiene
 * sesión, no lo desloguea — solo confirma que la password es correcta.
 */
function CambiarContrasena() {
  const navigate = useNavigate();
  const { profile } = useOutletContext();

  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordScore = useMemo(() => getPasswordStrength(newPass), [newPass]);
  const passwordLabel = getPasswordStrengthLabel(passwordScore);

  const errors = useMemo(() => {
    const e = {};
    if (touched.current && !current) {
      e.current = 'Ingresá tu contraseña actual.';
    }
    if (touched.newPass && newPass.length < 8) {
      e.newPass = 'La nueva contraseña debe tener al menos 8 caracteres.';
    }
    if (touched.newPass && newPass === current && newPass.length > 0) {
      e.newPass = 'La nueva contraseña debe ser diferente a la actual.';
    }
    if (touched.confirm && newPass !== confirm) {
      e.confirm = 'Las contraseñas no coinciden.';
    }
    return e;
  }, [current, newPass, confirm, touched]);

  const canSubmit =
    current.length > 0 &&
    newPass.length >= 8 &&
    newPass !== current &&
    newPass === confirm &&
    !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ current: true, newPass: true, confirm: true });
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    try {
      // Paso 1: verificar contraseña actual con signIn
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: current,
      });
      if (signInError) {
        throw new Error('CURRENT_WRONG');
      }

      // Paso 2: actualizar a la nueva contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPass,
      });
      if (updateError) throw updateError;

      // Éxito: redirect al dashboard con state para mostrar mensaje
      navigate('/mi-cuenta', {
        state: { passwordChanged: true },
        replace: true,
      });
    } catch (err) {
      console.error('[CambiarContrasena] error:', err);
      if (err.message === 'CURRENT_WRONG') {
        setError('La contraseña actual es incorrecta.');
      } else if (String(err.message).toLowerCase().includes('should be different')) {
        setError('La nueva contraseña debe ser diferente a la actual.');
      } else {
        setError('No pudimos cambiar tu contraseña. Intentá de nuevo.');
      }
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cambiar contraseña</h1>
        <p className={styles.subtitle}>
          Actualizá tu contraseña de acceso. Recomendamos usar una combinación
          de mayúsculas, números y símbolos para mayor seguridad.
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.card}>
          {/* Contraseña actual */}
          <div className={styles.field}>
            <label htmlFor="current" className={styles.label}>
              <Lock size={14} aria-hidden="true" />
              Contraseña actual <span className={styles.required}>*</span>
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="current"
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, current: true }))}
                className={errors.current ? `${styles.input} ${styles.inputError}` : styles.input}
                disabled={loading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className={styles.passwordToggle}
                aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            {errors.current && <p className={styles.fieldError}>{errors.current}</p>}
          </div>

          {/* Nueva contraseña */}
          <div className={styles.field}>
            <label htmlFor="newPass" className={styles.label}>
              <Lock size={14} aria-hidden="true" />
              Nueva contraseña <span className={styles.required}>*</span>
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="newPass"
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, newPass: true }))}
                className={errors.newPass ? `${styles.input} ${styles.inputError}` : styles.input}
                disabled={loading}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className={styles.passwordToggle}
                aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>

            {newPass && (
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

            {errors.newPass && <p className={styles.fieldError}>{errors.newPass}</p>}
            <p className={styles.hint}>Mínimo 8 caracteres. Recomendamos combinar mayúsculas, números y símbolos.</p>
          </div>

          {/* Confirmar */}
          <div className={styles.field}>
            <label htmlFor="confirm" className={styles.label}>
              <Lock size={14} aria-hidden="true" />
              Confirmar nueva contraseña <span className={styles.required}>*</span>
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
                className={errors.confirm ? `${styles.input} ${styles.inputError}` : styles.input}
                disabled={loading}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className={styles.passwordToggle}
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            {errors.confirm && <p className={styles.fieldError}>{errors.confirm}</p>}
          </div>

          {error && (
            <p className={styles.errorMessage} role="alert">{error}</p>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="submit"
            disabled={!canSubmit}
            className={styles.submitBtn}
          >
            <Lock size={16} aria-hidden="true" />
            {loading ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CambiarContrasena;