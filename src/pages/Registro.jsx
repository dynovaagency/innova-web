import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext.jsx';
import {
  isValidEmail,
  isValidCuitCuil,
  normalizeCuitCuil,
  getPasswordStrength,
  getPasswordStrengthLabel,
} from '../lib/validators.js';
import { ARGENTINA_PROVINCES } from '../lib/argentinaProvinces.js';
import styles from './Registro.module.css';

/**
 * Página de registro de usuarios (alumnos).
 *
 * Al terminar el registro exitoso:
 *   1. Se crea el usuario en Supabase Auth.
 *   2. Se inserta el registro en la tabla `usuarios`.
 *   3. Supabase envía mail de confirmación al usuario.
 *   4. Redirect a página de "revisá tu email".
 *
 * El usuario NO puede loguearse hasta confirmar el email. Sale de Supabase
 * (setting "Confirm email" está activado en el dashboard).
 */

const emptyForm = {
  nombre: '',
  apellido: '',
  email: '',
  documentoTipo: 'CUIL',
  documentoNumero: '',
  password: '',
  passwordConfirm: '',
  telefono: '',
  provincia: '',
  profesion: '',
  aceptaTerminos: false,
};

function Registro() {
  const navigate = useNavigate();
  const { signUp } = useAuthContext();

  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const passwordScore = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const passwordLabel = getPasswordStrengthLabel(passwordScore);

  // Validaciones inline
  const errors = useMemo(() => {
    const e = {};
    if (touched.nombre && !form.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    if (touched.apellido && !form.apellido.trim()) e.apellido = 'El apellido es obligatorio.';
    if (touched.email && !isValidEmail(form.email)) e.email = 'Ingresá un email válido.';
    if (touched.documentoNumero && form.documentoNumero) {
      if (!isValidCuitCuil(form.documentoNumero)) {
        e.documentoNumero = `El ${form.documentoTipo} no es válido. Verificá el número.`;
      }
    } else if (touched.documentoNumero && !form.documentoNumero) {
      e.documentoNumero = `El ${form.documentoTipo} es obligatorio.`;
    }
    if (touched.password && form.password.length < 8) {
      e.password = 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (touched.passwordConfirm && form.password !== form.passwordConfirm) {
      e.passwordConfirm = 'Las contraseñas no coinciden.';
    }
    return e;
  }, [form, touched]);

  // Validez del formulario completo (para habilitar el botón submit)
  const isFormValid = useMemo(() => {
    return (
      form.nombre.trim() &&
      form.apellido.trim() &&
      isValidEmail(form.email) &&
      form.documentoNumero &&
      isValidCuitCuil(form.documentoNumero) &&
      form.password.length >= 8 &&
      form.password === form.passwordConfirm &&
      form.aceptaTerminos
    );
  }, [form]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmitError('');
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Forzamos que se muestren todos los errores si aún no se tocaron
    setTouched({
      nombre: true,
      apellido: true,
      email: true,
      documentoNumero: true,
      password: true,
      passwordConfirm: true,
    });

    if (!isFormValid) return;

    setLoading(true);
    setSubmitError('');
    try {
      await signUp(form.email, form.password, {
        nombre: form.nombre,
        apellido: form.apellido,
        documento_tipo: form.documentoTipo,
        documento_numero: normalizeCuitCuil(form.documentoNumero),
        telefono: form.telefono || null,
        provincia: form.provincia || null,
        profesion: form.profesion || null,
      });
      navigate('/registro-exitoso', { state: { email: form.email } });
    } catch (err) {
      console.error('[Registro] error:', err);
      const message = mapErrorToSpanish(err.message);
      setSubmitError(message);
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
          <header className={styles.header}>
            <h1 className={styles.title}>Creá tu cuenta</h1>
            <p className={styles.subtitle}>
              Registrate para acceder a tus cursos, hacer un seguimiento de tus compras y recibir novedades.
            </p>
          </header>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {/* Datos personales */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Datos personales</legend>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label htmlFor="nombre" className={styles.label}>
                    Nombre <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    value={form.nombre}
                    onChange={handleChange('nombre')}
                    onBlur={handleBlur('nombre')}
                    className={errors.nombre ? `${styles.input} ${styles.inputError}` : styles.input}
                    disabled={loading}
                    autoComplete="given-name"
                  />
                  {errors.nombre && <p className={styles.fieldError}>{errors.nombre}</p>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="apellido" className={styles.label}>
                    Apellido <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="apellido"
                    type="text"
                    value={form.apellido}
                    onChange={handleChange('apellido')}
                    onBlur={handleBlur('apellido')}
                    className={errors.apellido ? `${styles.input} ${styles.inputError}` : styles.input}
                    disabled={loading}
                    autoComplete="family-name"
                  />
                  {errors.apellido && <p className={styles.fieldError}>{errors.apellido}</p>}
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>
                  Email <span className={styles.required}>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  onBlur={handleBlur('email')}
                  className={errors.email ? `${styles.input} ${styles.inputError}` : styles.input}
                  disabled={loading}
                  autoComplete="email"
                />
                {errors.email && <p className={styles.fieldError}>{errors.email}</p>}
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label htmlFor="documentoTipo" className={styles.label}>
                    Tipo de documento <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="documentoTipo"
                    value={form.documentoTipo}
                    onChange={handleChange('documentoTipo')}
                    className={styles.input}
                    disabled={loading}
                  >
                    <option value="CUIL">CUIL</option>
                    <option value="CUIT">CUIT</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="documentoNumero" className={styles.label}>
                    Número <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="documentoNumero"
                    type="text"
                    value={form.documentoNumero}
                    onChange={handleChange('documentoNumero')}
                    onBlur={handleBlur('documentoNumero')}
                    className={errors.documentoNumero ? `${styles.input} ${styles.inputError}` : styles.input}
                    disabled={loading}
                    placeholder="20-12345678-3"
                    inputMode="numeric"
                  />
                  {errors.documentoNumero && <p className={styles.fieldError}>{errors.documentoNumero}</p>}
                </div>
              </div>
            </fieldset>

            {/* Contraseña */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Contraseña</legend>

              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>
                  Contraseña <span className={styles.required}>*</span>
                </label>
                <div className={styles.passwordWrap}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange('password')}
                    onBlur={handleBlur('password')}
                    className={errors.password ? `${styles.input} ${styles.inputError}` : styles.input}
                    disabled={loading}
                    autoComplete="new-password"
                    minLength={8}
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

                {form.password && (
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
                <label htmlFor="passwordConfirm" className={styles.label}>
                  Confirmar contraseña <span className={styles.required}>*</span>
                </label>
                <div className={styles.passwordWrap}>
                  <input
                    id="passwordConfirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={form.passwordConfirm}
                    onChange={handleChange('passwordConfirm')}
                    onBlur={handleBlur('passwordConfirm')}
                    className={errors.passwordConfirm ? `${styles.input} ${styles.inputError}` : styles.input}
                    disabled={loading}
                    autoComplete="new-password"
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
            </fieldset>

            {/* Opcionales */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Datos adicionales (opcionales)</legend>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label htmlFor="telefono" className={styles.label}>Teléfono</label>
                  <input
                    id="telefono"
                    type="tel"
                    value={form.telefono}
                    onChange={handleChange('telefono')}
                    className={styles.input}
                    disabled={loading}
                    placeholder="Ej: 1122223333"
                    autoComplete="tel"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="provincia" className={styles.label}>Provincia</label>
                  <select
                    id="provincia"
                    value={form.provincia}
                    onChange={handleChange('provincia')}
                    className={styles.input}
                    disabled={loading}
                  >
                    <option value="">Elegí una provincia</option>
                    {ARGENTINA_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="profesion" className={styles.label}>Profesión</label>
                <input
                  id="profesion"
                  type="text"
                  value={form.profesion}
                  onChange={handleChange('profesion')}
                  className={styles.input}
                  disabled={loading}
                  placeholder="Ej: Trabajador/a social, Estudiante, Docente"
                />
              </div>
            </fieldset>

            {/* Términos */}
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.aceptaTerminos}
                  onChange={handleChange('aceptaTerminos')}
                  disabled={loading}
                />
                <span>
                  Acepto los{' '}
                  <Link to="/terminos" target="_blank" rel="noopener noreferrer" className={styles.link}>
                    Términos y Condiciones
                  </Link>{' '}
                  de INNOVA Trabajo Social.
                </span>
              </label>
            </div>

            {submitError && (
              <p className={styles.submitError} role="alert">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={styles.submitBtn}
            >
              <UserPlus size={18} aria-hidden="true" />
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            <p className={styles.loginLink}>
              ¿Ya tenés cuenta? <Link to="/" className={styles.link}>Iniciá sesión</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Traduce errores comunes de Supabase Auth al español.
 */
function mapErrorToSpanish(message) {
  const msg = String(message).toLowerCase();
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Ya existe una cuenta con ese email. Iniciá sesión o recuperá tu contraseña.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Demasiados intentos. Esperá un momento y probá de nuevo.';
  }
  if (msg.includes('cuenta creada pero no pudimos guardar')) {
    // Error que lanzamos desde useAuth cuando falla el insert en tabla usuarios
    return message;
  }
  return 'No pudimos crear la cuenta. Intentá de nuevo en unos segundos.';
}

export default Registro;