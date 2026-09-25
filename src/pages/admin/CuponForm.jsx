import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import { formatCurrency } from '../../lib/format.js';
import { toLocalInputValue, fromLocalInputValue } from './couponUtils.js';
import styles from './Cupones.module.css';

const buildEmptyForm = () => ({
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  startsAt: toLocalInputValue(new Date().toISOString()),
  expiresAt: '',
  maxUsesGlobal: '',
  maxUsesPerUser: '',
  applicableProducts: [],
  active: true,
});

/**
 * Formulario de alta / edición de cupones.
 *
 * Si el cupón ya tiene usos, se bloquean código, tipo, valor y productos
 * (el backend también lo valida).
 */
function CuponForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(buildEmptyForm);
  const [usesCount, setUsesCount] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const locked = isEdit && usesCount > 0;

  // Catálogo de productos para el selector
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch('/.netlify/functions/admin-products-list', {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error('[CuponForm] error cargando productos:', err);
      }
    };
    loadProducts();
  }, []);

  // Datos del cupón en modo edición
  useEffect(() => {
    if (!isEdit) return;
    const loadCoupon = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/.netlify/functions/admin-coupon-get?id=${encodeURIComponent(id)}`,
          { credentials: 'include' }
        );
        if (res.status === 404) {
          setLoadError('Este cupón no existe.');
          return;
        }
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const { coupon } = await res.json();
        setForm({
          code: coupon.code,
          description: coupon.description || '',
          discountType: coupon.discountType,
          discountValue: String(coupon.discountValue),
          startsAt: toLocalInputValue(coupon.startsAt),
          expiresAt: toLocalInputValue(coupon.expiresAt),
          maxUsesGlobal: coupon.maxUsesGlobal ? String(coupon.maxUsesGlobal) : '',
          maxUsesPerUser: coupon.maxUsesPerUser ? String(coupon.maxUsesPerUser) : '',
          applicableProducts: coupon.applicableProducts || [],
          active: coupon.active,
        });
        setUsesCount(coupon.usesCount || 0);
      } catch (err) {
        console.error('[CuponForm] error cargando cupón:', err);
        setLoadError(err.message || 'Error cargando el cupón');
      } finally {
        setLoading(false);
      }
    };
    loadCoupon();
  }, [id, isEdit]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const toggleProduct = (slug) => {
    setForm((prev) => {
      const selected = prev.applicableProducts.includes(slug)
        ? prev.applicableProducts.filter((s) => s !== slug)
        : [...prev.applicableProducts, slug];
      return { ...prev, applicableProducts: selected };
    });
    setFormError(null);
  };

  // Vista previa del descuento sobre un precio de ejemplo
  const preview = useMemo(() => {
    const value = Number(form.discountValue);
    if (!value || value <= 0) return null;
    return form.discountType === 'percentage'
      ? `${value}% de descuento sobre el precio del medio de pago elegido`
      : `${formatCurrency(value, 'ARS')} de descuento sobre el precio del medio de pago elegido`;
  }, [form.discountType, form.discountValue]);

  const validate = () => {
    if (!form.code.trim()) return 'El código es obligatorio.';
    if (!/^[A-Z0-9_-]{3,30}$/.test(form.code)) {
      return 'El código debe tener entre 3 y 30 caracteres: letras, números, guiones o guion bajo.';
    }
    const value = Number(form.discountValue);
    if (!value || value <= 0) return 'El valor del descuento debe ser mayor a cero.';
    if (form.discountType === 'percentage' && value > 100) {
      return 'El porcentaje no puede superar el 100%.';
    }
    if (!form.expiresAt) return 'La fecha de vencimiento es obligatoria.';
    if (form.startsAt && new Date(form.expiresAt) <= new Date(form.startsAt)) {
      return 'La fecha de vencimiento tiene que ser posterior a la de inicio.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);

    const body = {
      ...(isEdit && { id }),
      code: form.code,
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      startsAt: fromLocalInputValue(form.startsAt),
      expiresAt: fromLocalInputValue(form.expiresAt),
      maxUsesGlobal: form.maxUsesGlobal === '' ? null : Number(form.maxUsesGlobal),
      maxUsesPerUser: form.maxUsesPerUser === '' ? null : Number(form.maxUsesPerUser),
      applicableProducts: form.applicableProducts,
      active: form.active,
    };

    try {
      const res = await fetch('/.netlify/functions/admin-coupon-upsert', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || 'No se pudo guardar el cupón.');
        setSaving(false);
        return;
      }
      navigate(`/admin/cupones/${data.coupon.id}`, {
        state: { flash: isEdit ? 'Cupón actualizado' : 'Cupón creado' },
      });
    } catch (err) {
      console.error('[CuponForm] error guardando:', err);
      setFormError('No pudimos conectarnos con el servidor. Intentá de nuevo.');
      setSaving(false);
    }
  };

  const backTo = isEdit ? `/admin/cupones/${id}` : '/admin/cupones';
  const title = isEdit ? 'Editar cupón' : 'Nuevo cupón';

  if (loading) {
    return (
      <>
        <PageHeader title={title} subtitle="Cargando..." />
        <LoadingState message="Cargando cupón..." />
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <PageHeader title={title} />
        <ErrorState
          title="No pudimos cargar el cupón"
          message={loadError}
          action={{ label: 'Volver a cupones', onClick: () => navigate('/admin/cupones') }}
        />
      </>
    );
  }

  return (
    <>
      <Link to={backTo} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Volver
      </Link>

      <PageHeader
        title={title}
        subtitle={isEdit ? form.code : 'Definí el código, el descuento, la vigencia y los límites de uso.'}
      />

      {locked && (
        <div className={styles.lockedBanner}>
          <Lock size={16} aria-hidden="true" />
          <span>
            Este cupón ya se usó {usesCount} {usesCount === 1 ? 'vez' : 'veces'}. Para proteger el
            historial no se pueden cambiar el código, el descuento ni los productos. Si necesitás
            otro descuento, creá un cupón nuevo.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {/* Identificación */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Identificación</h2>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="code" className={styles.label}>Código *</label>
              <input
                id="code"
                type="text"
                value={form.code}
                onChange={(e) =>
                  updateField('code', e.target.value.toUpperCase().replace(/\s/g, ''))
                }
                className={styles.input}
                placeholder="VERANO20"
                maxLength={30}
                disabled={locked || saving}
              />
              <p className={styles.hint}>Letras, números, guiones. Se guarda en mayúsculas.</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="description" className={styles.label}>Descripción interna</label>
              <input
                id="description"
                type="text"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className={styles.input}
                placeholder="Ej: Campaña de primavera 2026"
                maxLength={120}
                disabled={saving}
              />
              <p className={styles.hint}>Solo la ven los administradores.</p>
            </div>
          </div>
        </section>

        {/* Descuento */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Descuento</h2>

          <div className={styles.row2}>
            <div className={styles.field}>
              <span className={styles.label}>Tipo *</span>
              <div className={styles.segmented} role="radiogroup">
                {[
                  { id: 'percentage', label: 'Porcentaje' },
                  { id: 'fixed', label: 'Monto fijo' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={form.discountType === opt.id}
                    onClick={() => updateField('discountType', opt.id)}
                    className={
                      form.discountType === opt.id
                        ? `${styles.segment} ${styles.segmentActive}`
                        : styles.segment
                    }
                    disabled={locked || saving}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="discountValue" className={styles.label}>
                Valor * {form.discountType === 'percentage' ? '(%)' : '($)'}
              </label>
              <input
                id="discountValue"
                type="number"
                min="1"
                max={form.discountType === 'percentage' ? 100 : undefined}
                step="1"
                value={form.discountValue}
                onChange={(e) => updateField('discountValue', e.target.value)}
                className={styles.input}
                placeholder={form.discountType === 'percentage' ? '20' : '5000'}
                disabled={locked || saving}
              />
              {preview && <p className={styles.hint}>{preview}</p>}
            </div>
          </div>
        </section>

        {/* Vigencia */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Vigencia</h2>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="startsAt" className={styles.label}>Desde</label>
              <input
                id="startsAt"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => updateField('startsAt', e.target.value)}
                className={styles.input}
                disabled={saving}
              />
              <p className={styles.hint}>Si lo dejás vacío, arranca en el momento de crearlo.</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="expiresAt" className={styles.label}>Hasta *</label>
              <input
                id="expiresAt"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => updateField('expiresAt', e.target.value)}
                className={styles.input}
                disabled={saving}
              />
            </div>
          </div>
        </section>

        {/* Límites */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Límites de uso</h2>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="maxUsesGlobal" className={styles.label}>Usos totales</label>
              <input
                id="maxUsesGlobal"
                type="number"
                min="1"
                step="1"
                value={form.maxUsesGlobal}
                onChange={(e) => updateField('maxUsesGlobal', e.target.value)}
                className={styles.input}
                placeholder="Sin límite"
                disabled={saving}
              />
              <p className={styles.hint}>Cuántas compras en total pueden usar el código.</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="maxUsesPerUser" className={styles.label}>Usos por persona</label>
              <input
                id="maxUsesPerUser"
                type="number"
                min="1"
                step="1"
                value={form.maxUsesPerUser}
                onChange={(e) => updateField('maxUsesPerUser', e.target.value)}
                className={styles.input}
                placeholder="Sin límite"
                disabled={saving}
              />
              <p className={styles.hint}>Se cuenta por email del comprador.</p>
            </div>
          </div>
        </section>

        {/* Productos */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Productos</h2>
          <p className={styles.hint}>
            Si no elegís ninguno, el cupón aplica a todas las cápsulas y cursos.
          </p>

          {products.length === 0 ? (
            <p className={styles.muted}>No pudimos cargar el catálogo de productos.</p>
          ) : (
            <div className={styles.checkboxList}>
              {products.map((p) => (
                <label key={p.slug} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    checked={form.applicableProducts.includes(p.slug)}
                    onChange={() => toggleProduct(p.slug)}
                    disabled={locked || saving}
                  />
                  <span>
                    {p.title}
                    <span className={styles.muted}>
                      {' '}· {p.modalidad === 'capsula' ? 'Cápsula' : 'Curso'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Estado */}
        <section className={styles.formSection}>
          <label className={styles.checkboxItem}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => updateField('active', e.target.checked)}
              disabled={saving}
            />
            <span>Cupón activo</span>
          </label>
          <p className={styles.hint}>
            Un cupón inactivo no se puede usar aunque esté dentro de la vigencia.
          </p>
        </section>

        {formError && (
          <p className={styles.formError} role="alert">{formError}</p>
        )}

        <div className={styles.formActions}>
          <Link to={backTo} className={styles.secondaryBtn}>Cancelar</Link>
          <button type="submit" className={styles.primaryBtn} disabled={saving}>
            <Save size={16} aria-hidden="true" />
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cupón'}
          </button>
        </div>
      </form>
    </>
  );
}

export default CuponForm;