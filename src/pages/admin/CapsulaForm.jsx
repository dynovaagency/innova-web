import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import Toast from '../../components/admin/Toast.jsx';
import useToast from '../../hooks/useToast.js';
import styles from './CapsulaForm.module.css';

/**
 * Formulario de creación / edición de cápsulas.
 *
 * Modo:
 *   - Crear:  /admin/capsulas/nueva  (params.slug === undefined)
 *   - Editar: /admin/capsulas/:slug/editar
 *
 * Sprint 2.7: precios por método de pago (opcionales).
 *   - priceTransferencia: precio final si eligen transferencia.
 *   - priceGocuotas: precio final si eligen Go Cuotas.
 *   - gocuotasUrl: link específico de Go Cuotas para este producto.
 *
 * Si un producto no tiene precio específico, el flujo usa el precio base.
 */

const CURRENCY_OPTIONS = [
  { value: 'ARS', label: 'ARS (pesos argentinos)' },
  { value: 'USD', label: 'USD (dólares)' },
];

const CONTENT_TYPE_OPTIONS = [
  {
    value: 'embed',
    label: 'Embebido (Genially, YouTube, Vimeo, etc.)',
    hint: 'Se muestra directamente en la página del curso. Ideal para contenido que no requiere reunión en vivo.',
  },
  {
    value: 'external_link',
    label: 'Link externo (Google Meet, Teams, Zoom)',
    hint: 'Se muestra como botón para abrir en pestaña nueva. Ideal para reuniones en vivo.',
  },
];

const MODALIDAD_OPTIONS = [
  { value: 'capsula', label: 'Cápsula (autoaprendizaje)' },
  { value: 'curso', label: 'Curso (con clases en vivo o cohorte)' },
];

const emptyForm = {
  slug: '',
  type: 'capsula_genially',
  title: '',
  subtitle: '',
  description: '',
  price: '',
  currency: 'ARS',
  active: true,
  category: '',
  duration: '',
  featured: false,
  imageUrl: '',
  contentType: 'embed',
  contentUrl: '',
  modalidad: 'capsula',
  priceTransferencia: '',
  priceGocuotas: '',
  gocuotasUrl: '',
};

const isValidSlug = (slug) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
const isValidUrl = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

function CapsulaForm() {
  const navigate = useNavigate();
  const { slug: paramSlug } = useParams();
  const toast = useToast();
  const isEditing = Boolean(paramSlug);

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchProduct = useCallback(async () => {
    if (!isEditing) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/.netlify/functions/admin-product-get?slug=${encodeURIComponent(paramSlug)}`,
        { credentials: 'include' }
      );
      if (res.status === 404) {
        setLoadError('Esta cápsula no existe o fue eliminada.');
        return;
      }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const p = data.product;
      setForm({
        slug: p.slug,
        type: p.type || 'capsula_genially',
        title: p.title || '',
        subtitle: p.subtitle || '',
        description: p.description || '',
        price: String(p.price ?? ''),
        currency: p.currency || 'ARS',
        active: p.active !== false,
        category: p.category || '',
        duration: p.duration || '',
        featured: p.featured === true,
        imageUrl: p.imageUrl || '',
        contentType: p.contentType || 'embed',
        contentUrl: p.contentUrl || p.geniallyUrl || '',
        modalidad: p.modalidad || 'capsula',
        priceTransferencia: p.priceTransferencia ? String(p.priceTransferencia) : '',
        priceGocuotas: p.priceGocuotas ? String(p.priceGocuotas) : '',
        gocuotasUrl: p.gocuotasUrl || '',
      });
    } catch (err) {
      console.error('[CapsulaForm] fetch error:', err);
      setLoadError(err.message || 'Error cargando la cápsula');
    } finally {
      setLoading(false);
    }
  }, [isEditing, paramSlug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const nextSlug =
        !isEditing && (prev.slug === '' || prev.slug === autoSlug(prev.title))
          ? autoSlug(value)
          : prev.slug;
      return { ...prev, title: value, slug: nextSlug };
    });
    setFieldErrors((prev) => ({ ...prev, title: undefined, slug: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (!form.slug.trim()) errors.slug = 'El slug es obligatorio.';
    else if (!isValidSlug(form.slug)) errors.slug = 'Solo letras minúsculas, números y guiones. Ej: vulnerabilidad-social.';
    if (!form.title.trim()) errors.title = 'El título es obligatorio.';
    if (!form.description.trim()) errors.description = 'La descripción es obligatoria.';
    const priceNum = Number(form.price);
    if (!form.price || isNaN(priceNum) || priceNum <= 0) errors.price = 'El precio debe ser mayor a 0.';
    if (!form.category.trim()) errors.category = 'La categoría es obligatoria.';
    if (!form.duration.trim()) errors.duration = 'La duración es obligatoria.';
    if (!form.contentUrl.trim()) errors.contentUrl = 'La URL del contenido es obligatoria.';
    else if (!isValidUrl(form.contentUrl)) errors.contentUrl = 'La URL debe empezar con http:// o https://.';
    if (form.imageUrl && !isValidUrl(form.imageUrl)) errors.imageUrl = 'La URL de la imagen debe empezar con http:// o https://.';

    // Sprint 2.7: validaciones opcionales de precios por método
    if (form.priceTransferencia) {
      const p = Number(form.priceTransferencia);
      if (isNaN(p) || p <= 0) errors.priceTransferencia = 'El precio por transferencia debe ser mayor a 0.';
    }
    if (form.priceGocuotas) {
      const p = Number(form.priceGocuotas);
      if (isNaN(p) || p <= 0) errors.priceGocuotas = 'El precio por Go Cuotas debe ser mayor a 0.';
    }
    if (form.gocuotasUrl && !isValidUrl(form.gocuotasUrl)) {
      errors.gocuotasUrl = 'La URL debe empezar con http:// o https://.';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Revisá los campos', 'Hay errores de validación en el formulario.');
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      const res = await fetch('/.netlify/functions/admin-product-upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          priceTransferencia: form.priceTransferencia ? Number(form.priceTransferencia) : null,
          priceGocuotas: form.priceGocuotas ? Number(form.priceGocuotas) : null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.validation && Array.isArray(body.validation)) {
          const serverErrors = {};
          body.validation.forEach((msg) => {
            const [field, ...rest] = msg.split(':');
            serverErrors[field.trim()] = rest.join(':').trim() || msg;
          });
          setFieldErrors(serverErrors);
        }
        throw new Error(body.error || 'No se pudo guardar la cápsula');
      }
      toast.success(
        body.created ? 'Cápsula creada' : 'Cambios guardados',
        `${body.product.title} ${body.created ? 'está disponible' : 'se actualizó correctamente'}.`
      );
      setTimeout(() => navigate('/admin/capsulas'), 1000);
    } catch (err) {
      console.error('[CapsulaForm] submit error:', err);
      toast.error('Error al guardar', err.message);
      setSaving(false);
    }
  };

  const contentTypeOption = CONTENT_TYPE_OPTIONS.find((o) => o.value === form.contentType);

  if (loading) {
    return (
      <>
        <PageHeader title={isEditing ? 'Editar cápsula' : 'Nueva cápsula'} subtitle="Cargando datos..." />
        <LoadingState message="Cargando cápsula..." />
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Editar cápsula" subtitle="No pudimos cargar los datos." />
        <ErrorState
          title="Cápsula no disponible"
          message={loadError}
          action={{ label: 'Volver al listado', onClick: () => navigate('/admin/capsulas') }}
        />
      </>
    );
  }

  return (
    <>
      <Link to="/admin/capsulas" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Volver al listado
      </Link>

      <PageHeader
        title={isEditing ? 'Editar cápsula' : 'Nueva cápsula'}
        subtitle={
          isEditing
            ? 'Modificá los datos y guardá los cambios.'
            : 'Completá los datos para publicar una nueva cápsula.'
        }
      />

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {/* Bloque 1: Datos principales */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Datos principales</legend>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="title" className={styles.label}>
                Título <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={handleTitleChange}
                className={fieldErrors.title ? styles.inputError : styles.input}
                disabled={saving}
                aria-invalid={!!fieldErrors.title}
                placeholder="Ej: Vulnerabilidad Social y..."
              />
              {fieldErrors.title && <span className={styles.errorText}>{fieldErrors.title}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="slug" className={styles.label}>
                Slug (URL) <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="slug"
                type="text"
                value={form.slug}
                onChange={handleChange('slug')}
                className={fieldErrors.slug ? styles.inputError : styles.input}
                disabled={saving || isEditing}
                aria-invalid={!!fieldErrors.slug}
                placeholder="vulnerabilidad-social"
                aria-describedby="slug-hint"
              />
              <span id="slug-hint" className={styles.hint}>
                {isEditing
                  ? 'El slug no puede cambiarse una vez creada la cápsula.'
                  : 'Se genera desde el título. Solo letras minúsculas, números y guiones.'}
              </span>
              {fieldErrors.slug && <span className={styles.errorText}>{fieldErrors.slug}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="subtitle" className={styles.label}>Subtítulo</label>
            <input
              id="subtitle"
              type="text"
              value={form.subtitle}
              onChange={handleChange('subtitle')}
              className={styles.input}
              disabled={saving}
              placeholder="Cápsula Formativa"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Descripción <span className={styles.required} aria-hidden="true">*</span>
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={handleChange('description')}
              className={fieldErrors.description ? styles.textareaError : styles.textarea}
              disabled={saving}
              aria-invalid={!!fieldErrors.description}
              rows={5}
              placeholder="Describí el contenido y el enfoque de la cápsula..."
              aria-describedby="description-hint"
            />
            <span id="description-hint" className={styles.hint}>
              Se muestra completa en el detalle público. En las cards del listado se trunca automáticamente.
            </span>
            {fieldErrors.description && <span className={styles.errorText}>{fieldErrors.description}</span>}
          </div>
        </fieldset>

        {/* Bloque 2: Categorización y presentación */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Categorización y presentación</legend>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="category" className={styles.label}>
                Categoría <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="category"
                type="text"
                value={form.category}
                onChange={handleChange('category')}
                className={fieldErrors.category ? styles.inputError : styles.input}
                disabled={saving}
                aria-invalid={!!fieldErrors.category}
                placeholder="Ej: Intervención Social"
                aria-describedby="category-hint"
              />
              <span id="category-hint" className={styles.hint}>
                Se muestra como tag en las cards. Ejemplos: Derechos Humanos, Salud Mental, Familia e Infancias.
              </span>
              {fieldErrors.category && <span className={styles.errorText}>{fieldErrors.category}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="duration" className={styles.label}>
                Duración <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="duration"
                type="text"
                value={form.duration}
                onChange={handleChange('duration')}
                className={fieldErrors.duration ? styles.inputError : styles.input}
                disabled={saving}
                aria-invalid={!!fieldErrors.duration}
                placeholder="Ej: 25 horas acreditadas"
              />
              {fieldErrors.duration && <span className={styles.errorText}>{fieldErrors.duration}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="imageUrl" className={styles.label}>URL de la imagen</label>
            <input
              id="imageUrl"
              type="url"
              value={form.imageUrl}
              onChange={handleChange('imageUrl')}
              className={fieldErrors.imageUrl ? styles.inputError : styles.input}
              disabled={saving}
              aria-invalid={!!fieldErrors.imageUrl}
              placeholder="https://..."
              aria-describedby="image-hint"
            />
            <span id="image-hint" className={styles.hint}>
              Imagen que se muestra en las cards del listado. Si no la ponés, se usa un placeholder por default.
            </span>
            {fieldErrors.imageUrl && <span className={styles.errorText}>{fieldErrors.imageUrl}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="modalidad" className={styles.label}>Modalidad</label>
            <select
              id="modalidad"
              value={form.modalidad}
              onChange={handleChange('modalidad')}
              className={styles.input}
              disabled={saving}
              aria-describedby="modalidad-hint"
            >
              {MODALIDAD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span id="modalidad-hint" className={styles.hint}>
              Determina el label que se muestra en las cards (CÁPSULA o CURSO). No afecta el flujo técnico.
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={handleChange('featured')}
                disabled={saving}
              />
              <span>
                <span className={styles.checkboxTitle}>Cápsula destacada</span>
                <span className={styles.checkboxHint}>
                  Aparece como cápsula destacada arriba del listado. Si hay varias marcadas, se destaca la más reciente.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {/* Bloque 3: Precio */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Precio</legend>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="price" className={styles.label}>
                Precio base <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="price"
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={handleChange('price')}
                className={fieldErrors.price ? styles.inputError : styles.input}
                disabled={saving}
                aria-invalid={!!fieldErrors.price}
                placeholder="28000"
                aria-describedby="price-hint"
              />
              <span id="price-hint" className={styles.hint}>
                Es el precio general. Se usa por default para MercadoPago y para cualquier método sin precio específico.
              </span>
              {fieldErrors.price && <span className={styles.errorText}>{fieldErrors.price}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="currency" className={styles.label}>Moneda</label>
              <select
                id="currency"
                value={form.currency}
                onChange={handleChange('currency')}
                className={styles.input}
                disabled={saving}
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Bloque 4 (NUEVO Sprint 2.7): Precios por método de pago */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Precios por método de pago (opcional)</legend>

          <p className={styles.blockIntro}>
            Si querés cobrar un precio distinto al base según el método de pago elegido, completá los campos abajo. Si dejás alguno vacío, ese método usa el precio base.
          </p>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="priceTransferencia" className={styles.label}>
                Precio por transferencia bancaria
              </label>
              <input
                id="priceTransferencia"
                type="number"
                min="0"
                step="1"
                value={form.priceTransferencia}
                onChange={handleChange('priceTransferencia')}
                className={fieldErrors.priceTransferencia ? styles.inputError : styles.input}
                disabled={saving}
                aria-invalid={!!fieldErrors.priceTransferencia}
                placeholder="Ej: 110000 (dejar vacío para usar el precio base)"
                aria-describedby="priceTransferencia-hint"
              />
              <span id="priceTransferencia-hint" className={styles.hint}>
                Muchas veces se ofrece un descuento por transferencia. Dejalo vacío para usar el precio base.
              </span>
              {fieldErrors.priceTransferencia && <span className={styles.errorText}>{fieldErrors.priceTransferencia}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="priceGocuotas" className={styles.label}>
                Precio por Go Cuotas
              </label>
              <input
                id="priceGocuotas"
                type="number"
                min="0"
                step="1"
                value={form.priceGocuotas}
                onChange={handleChange('priceGocuotas')}
                className={fieldErrors.priceGocuotas ? styles.inputError : styles.input}
                disabled={saving}
                aria-invalid={!!fieldErrors.priceGocuotas}
                placeholder="Ej: 125000 (dejar vacío para usar el precio base)"
                aria-describedby="priceGocuotas-hint"
              />
              <span id="priceGocuotas-hint" className={styles.hint}>
                Si el link de Go Cuotas tiene el monto en la URL, tiene que coincidir con este precio.
              </span>
              {fieldErrors.priceGocuotas && <span className={styles.errorText}>{fieldErrors.priceGocuotas}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="gocuotasUrl" className={styles.label}>URL específica de Go Cuotas</label>
            <input
              id="gocuotasUrl"
              type="url"
              value={form.gocuotasUrl}
              onChange={handleChange('gocuotasUrl')}
              className={fieldErrors.gocuotasUrl ? styles.inputError : styles.input}
              disabled={saving}
              aria-invalid={!!fieldErrors.gocuotasUrl}
              placeholder="https://www.gocuotas.com/payment_link/checkouts/..."
              aria-describedby="gocuotasUrl-hint"
            />
            <span id="gocuotasUrl-hint" className={styles.hint}>
              Link generado desde el panel de Go Cuotas para este producto. Si lo dejás vacío, el botón lleva al home de Go Cuotas.
            </span>
            {fieldErrors.gocuotasUrl && <span className={styles.errorText}>{fieldErrors.gocuotasUrl}</span>}
          </div>
        </fieldset>

        {/* Bloque 5: Contenido */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Contenido del curso</legend>

          <div className={styles.field}>
            <label htmlFor="contentType" className={styles.label}>Tipo de contenido</label>
            <select
              id="contentType"
              value={form.contentType}
              onChange={handleChange('contentType')}
              className={styles.input}
              disabled={saving}
            >
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {contentTypeOption && (
              <span className={styles.hint}>{contentTypeOption.hint}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="contentUrl" className={styles.label}>
              URL del contenido <span className={styles.required} aria-hidden="true">*</span>
            </label>
            <input
              id="contentUrl"
              type="url"
              value={form.contentUrl}
              onChange={handleChange('contentUrl')}
              className={fieldErrors.contentUrl ? styles.inputError : styles.input}
              disabled={saving}
              aria-invalid={!!fieldErrors.contentUrl}
              placeholder={
                form.contentType === 'external_link'
                  ? 'https://meet.google.com/... o https://teams.microsoft.com/...'
                  : 'https://view.genially.com/... o https://youtube.com/...'
              }
              aria-describedby="content-hint"
            />
            <span id="content-hint" className={styles.hint}>
              {form.contentType === 'external_link'
                ? 'El comprador va a ver un botón que abre este link en pestaña nueva.'
                : 'El contenido se va a mostrar embebido en la página del curso. Verificá que la URL permita embed.'}
            </span>
            {fieldErrors.contentUrl && <span className={styles.errorText}>{fieldErrors.contentUrl}</span>}
          </div>
        </fieldset>

        {/* Bloque 6: Publicación */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Publicación</legend>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={handleChange('active')}
                disabled={saving}
              />
              <span>
                <span className={styles.checkboxTitle}>Cápsula activa</span>
                <span className={styles.checkboxHint}>
                  Cuando está activa, aparece en el sitio público y puede comprarse.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={() => navigate('/admin/capsulas')}
            className={styles.secondaryBtn}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={saving}
          >
            <Save size={16} aria-hidden="true" />
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cápsula'}
          </button>
        </div>
      </form>

      <Toast {...toast.props} />
    </>
  );
}

function autoSlug(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default CapsulaForm;