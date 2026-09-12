import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, CheckCircle, User, Mail, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { ARGENTINA_PROVINCES } from '../../lib/argentinaProvinces.js';
import styles from './MiPerfil.module.css';

/**
 * Página "Mi perfil" del panel de alumno.
 *
 * Permite editar los datos personales del usuario. Email y documento
 * no son editables por el usuario (requiere contactar soporte).
 *
 * El update usa la RLS de Supabase (usuarios_update_own) — el usuario
 * solo puede editar su propia fila. No hace falta backend.
 */
function MiPerfil() {
  const { profile } = useOutletContext();

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    provincia: '',
    profesion: '',
  });
  const [initialForm, setInitialForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Cargar datos iniciales del profile
  useEffect(() => {
    if (profile) {
      const initial = {
        nombre: profile.nombre || '',
        apellido: profile.apellido || '',
        telefono: profile.telefono || '',
        provincia: profile.provincia || '',
        profesion: profile.profesion || '',
      };
      setForm(initial);
      setInitialForm(initial);
    }
  }, [profile]);

  // Detectar cambios reales
  const hasChanges = useMemo(() => {
    return Object.keys(form).some((key) => form[key] !== initialForm[key]);
  }, [form, initialForm]);

  const canSubmit = hasChanges && form.nombre.trim() && form.apellido.trim() && !loading;

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          telefono: form.telefono.trim() || null,
          provincia: form.provincia.trim() || null,
          profesion: form.profesion.trim() || null,
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setInitialForm({ ...form });
      setSuccess(true);
      // El profile se refresca automáticamente en el próximo mount o navigate
    } catch (err) {
      console.error('[MiPerfil] error:', err);
      setError('No pudimos guardar los cambios. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mi perfil</h1>
        <p className={styles.subtitle}>
          Actualizá tus datos personales cuando quieras. Los datos no editables requieren contacto con soporte.
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {/* Datos no editables */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos de la cuenta</h2>
          <p className={styles.sectionHelp}>
            Para modificar estos datos, escribinos a{' '}
            <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.link}>
              innovatrabajosocial@trabajosocial.ar
            </a>
            .
          </p>

          <div className={styles.field}>
            <label className={styles.label}>
              <Mail size={14} aria-hidden="true" />
              Email
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              className={styles.input}
              disabled
              readOnly
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <FileText size={14} aria-hidden="true" />
              Documento
            </label>
            <input
              type="text"
              value={`${profile?.documento_tipo || ''} ${profile?.documento_numero || ''}`.trim()}
              className={styles.input}
              disabled
              readOnly
            />
          </div>
        </section>

        {/* Datos editables */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos personales</h2>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="nombre" className={styles.label}>
                <User size={14} aria-hidden="true" />
                Nombre <span className={styles.required}>*</span>
              </label>
              <input
                id="nombre"
                type="text"
                value={form.nombre}
                onChange={handleChange('nombre')}
                className={styles.input}
                disabled={loading}
                required
              />
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
                className={styles.input}
                disabled={loading}
                required
              />
            </div>
          </div>
        </section>

        {/* Datos opcionales */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos adicionales</h2>

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
                <option value="">Sin especificar</option>
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
        </section>

        {/* Mensajes de feedback */}
        {error && (
          <p className={styles.errorMessage} role="alert">{error}</p>
        )}

        {success && (
          <div className={styles.successMessage} role="status">
            <CheckCircle size={18} aria-hidden="true" />
            <span>Cambios guardados correctamente.</span>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            disabled={!canSubmit}
            className={styles.submitBtn}
          >
            <Save size={16} aria-hidden="true" />
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>

          {hasChanges && !loading && (
            <button
              type="button"
              onClick={() => setForm(initialForm)}
              className={styles.cancelBtn}
            >
              Descartar cambios
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default MiPerfil;