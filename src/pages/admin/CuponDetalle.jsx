import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Power } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import Badge from '../../components/admin/Badge.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import Toast from '../../components/admin/Toast.jsx';
import useToast from '../../hooks/useToast.js';
import { formatCurrency, formatDateTime } from '../../lib/format.js';
import { COUPON_STATUS, formatDiscount, formatUses } from './couponUtils.js';
import styles from './Cupones.module.css';

/**
 * Detalle de un cupón: resumen, estadísticas e historial de usos.
 */
function CuponDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [coupon, setCoupon] = useState(null);
  const [uses, setUses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState({ open: false, loading: false });

  const fetchCoupon = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/.netlify/functions/admin-coupon-get?id=${encodeURIComponent(id)}`,
        { credentials: 'include' }
      );
      if (res.status === 404) {
        setError('Este cupón no existe.');
        return;
      }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setCoupon(data.coupon);
      setUses(data.uses || []);
    } catch (err) {
      console.error('[CuponDetalle] fetch error:', err);
      setError(err.message || 'Error cargando el cupón');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCoupon();
  }, [fetchCoupon]);

  // Mensaje de éxito que viene del formulario (crear / editar)
  useEffect(() => {
    if (location.state?.flash) {
      toast.success(location.state.flash);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleConfirm = async () => {
    setConfirmToggle((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/.netlify/functions/admin-coupon-toggle-active', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !coupon.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el cupón');
      toast.success(coupon.active ? 'Cupón desactivado' : 'Cupón activado');
      setConfirmToggle({ open: false, loading: false });
      fetchCoupon();
    } catch (err) {
      console.error('[CuponDetalle] toggle error:', err);
      toast.error('No se pudo actualizar', err.message);
      setConfirmToggle((prev) => ({ ...prev, loading: false }));
    }
  };

  if (loading) {
    return (
      <>
        <Link to="/admin/cupones" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a cupones
        </Link>
        <PageHeader title="Detalle del cupón" subtitle="Cargando..." />
        <LoadingState message="Cargando cupón..." />
      </>
    );
  }

  if (error || !coupon) {
    return (
      <>
        <Link to="/admin/cupones" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a cupones
        </Link>
        <PageHeader title="Detalle del cupón" />
        <ErrorState
          title="No pudimos cargar el cupón"
          message={error || 'Cupón no encontrado'}
          action={{ label: 'Volver a cupones', onClick: () => navigate('/admin/cupones') }}
        />
      </>
    );
  }

  const status = COUPON_STATUS[coupon.status] || COUPON_STATUS.inactive;

  return (
    <>
      <Link to="/admin/cupones" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a cupones
      </Link>

      <PageHeader
        title={coupon.code}
        subtitle={coupon.description || 'Sin descripción'}
        actions={
          <div className={styles.actionsRow}>
            <Link to={`/admin/cupones/${id}/editar`} className={styles.secondaryBtn}>
              <Pencil size={16} aria-hidden="true" />
              Editar
            </Link>
            <button
              type="button"
              onClick={() => setConfirmToggle({ open: true, loading: false })}
              className={coupon.active ? styles.dangerBtn : styles.primaryBtn}
            >
              <Power size={16} aria-hidden="true" />
              {coupon.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        }
      />

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Estado</p>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Descuento</p>
          <p className={styles.statValue}>{formatDiscount(coupon)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Usos</p>
          <p className={styles.statValue}>{formatUses(coupon)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total descontado</p>
          <p className={styles.statValue}>{formatCurrency(coupon.totalDiscounted, 'ARS')}</p>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Configuración</h2>
          <dl className={styles.dl}>
            <div className={styles.dlRow}>
              <dt>Vigente desde</dt>
              <dd>{formatDateTime(coupon.startsAt)}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Vigente hasta</dt>
              <dd>{formatDateTime(coupon.expiresAt)}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Usos totales</dt>
              <dd>{coupon.maxUsesGlobal || 'Sin límite'}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Usos por persona</dt>
              <dd>{coupon.maxUsesPerUser || 'Sin límite'}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Productos</dt>
              <dd>
                {coupon.applicableProducts.length === 0 ? (
                  'Todos'
                ) : (
                  <span className={styles.tags}>
                    {coupon.applicableProducts.map((slug) => (
                      <code key={slug} className={styles.tag}>{slug}</code>
                    ))}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Registro</h2>
          <dl className={styles.dl}>
            <div className={styles.dlRow}>
              <dt>Creado por</dt>
              <dd>{coupon.createdBy || '—'}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Creado el</dt>
              <dd>{formatDateTime(coupon.createdAt)}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Última modificación</dt>
              <dd>{formatDateTime(coupon.updatedAt)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={`${styles.card} ${styles.cardWide}`}>
        <h2 className={styles.sectionTitle}>Historial de usos</h2>
        {uses.length === 0 ? (
          <p className={styles.muted}>
            Todavía no se usó. Los usos se registran cuando el pago se aprueba.
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Comprador</th>
                  <th>Precio original</th>
                  <th>Descuento</th>
                  <th>Pagado</th>
                  <th>Pago</th>
                </tr>
              </thead>
              <tbody>
                {uses.map((u) => (
                  <tr key={u.id}>
                    <td>{formatDateTime(u.usedAt)}</td>
                    <td>{u.buyerEmail}</td>
                    <td>{formatCurrency(u.originalAmount, 'ARS')}</td>
                    <td>− {formatCurrency(u.discountApplied, 'ARS')}</td>
                    <td className={styles.strong}>{formatCurrency(u.finalAmount, 'ARS')}</td>
                    <td>
                      <Link
                        to={`/admin/pagos/${encodeURIComponent(u.externalReference)}`}
                        className={styles.link}
                      >
                        Ver pago
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmToggle.open}
        title={coupon.active ? '¿Desactivar este cupón?' : '¿Activar este cupón?'}
        message={
          coupon.active
            ? `El código ${coupon.code} dejará de funcionar en el checkout. El historial de usos se conserva y podés reactivarlo cuando quieras.`
            : `El código ${coupon.code} volverá a funcionar en el checkout, siempre que esté dentro de su vigencia y límites de uso.`
        }
        confirmLabel={coupon.active ? 'Sí, desactivar' : 'Sí, activar'}
        loading={confirmToggle.loading}
        onConfirm={handleToggleConfirm}
        onCancel={() => setConfirmToggle({ open: false, loading: false })}
      />

      <Toast {...toast.props} />
    </>
  );
}

export default CuponDetalle;