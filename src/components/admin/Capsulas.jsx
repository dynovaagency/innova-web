import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Eye, EyeOff, BookOpen } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import EmptyState from '../../components/admin/EmptyState.jsx';
import Badge from '../../components/admin/Badge.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import Toast from '../../components/admin/Toast.jsx';
import useToast from '../../hooks/useToast.js';
import { formatCurrency, formatDate } from '../../lib/format.js';
import styles from './Capsulas.module.css';

/**
 * Vista de listado de cápsulas.
 *
 * Muestra todas las cápsulas (activas + inactivas) con filtro por estado,
 * acciones de editar y activar/desactivar. El formulario de creación y
 * edición vive en CapsulaForm (rutas /admin/capsulas/nueva y /:slug/editar).
 */

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
];

function Capsulas() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  // Estado del dialog de confirmación de toggle
  const [confirmToggle, setConfirmToggle] = useState({
    open: false,
    product: null,
    nextActive: null,
    loading: false,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/admin-products-list', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('[Capsulas] fetch error:', err);
      setError(err.message || 'Error cargando cápsulas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = (products || []).filter((p) => {
    if (filter === 'active') return p.active;
    if (filter === 'inactive') return !p.active;
    return true;
  });

  const openToggleConfirm = (product) => {
    setConfirmToggle({
      open: true,
      product,
      nextActive: !product.active,
      loading: false,
    });
  };

  const closeToggleConfirm = () => {
    setConfirmToggle({ open: false, product: null, nextActive: null, loading: false });
  };

  const handleToggleConfirm = async () => {
    const { product, nextActive } = confirmToggle;
    if (!product) return;

    setConfirmToggle((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/.netlify/functions/admin-product-toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slug: product.slug, active: nextActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo cambiar el estado');
      }
      toast.success(
        nextActive ? 'Cápsula activada' : 'Cápsula desactivada',
        `${product.title} ${nextActive ? 'ya está visible en el sitio' : 'quedó oculta del sitio público'}.`
      );
      closeToggleConfirm();
      fetchProducts();
    } catch (err) {
      console.error('[Capsulas] toggle error:', err);
      toast.error('Error al cambiar el estado', err.message);
      setConfirmToggle((prev) => ({ ...prev, loading: false }));
    }
  };

  const pageActions = (
    <button
      type="button"
      onClick={() => navigate('/admin/capsulas/nueva')}
      className={styles.primaryBtn}
    >
      <Plus size={16} aria-hidden="true" />
      Nueva cápsula
    </button>
  );

  if (loading) {
    return (
      <>
        <PageHeader
          title="Cápsulas"
          subtitle="Gestión del catálogo de cápsulas formativas."
          actions={pageActions}
        />
        <LoadingState message="Cargando cápsulas..." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Cápsulas"
          subtitle="Gestión del catálogo de cápsulas formativas."
          actions={pageActions}
        />
        <ErrorState
          title="No pudimos cargar el catálogo"
          message={error}
          action={{ label: 'Reintentar', onClick: fetchProducts }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Cápsulas"
        subtitle="Gestión del catálogo de cápsulas formativas."
        actions={pageActions}
      />

      <div className={styles.filterBar}>
        <div className={styles.filterGroup} role="group" aria-label="Filtrar cápsulas por estado">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`${styles.filterBtn} ${filter === opt.value ? styles.filterBtn_active : ''}`}
              aria-pressed={filter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className={styles.counter}>
          {filteredProducts.length} de {(products || []).length}
        </p>
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No hay cápsulas para mostrar"
          message={
            filter === 'all'
              ? 'Todavía no hay cápsulas cargadas. Empezá creando una nueva.'
              : `No hay cápsulas ${filter === 'active' ? 'activas' : 'inactivas'} en este momento.`
          }
          action={
            filter === 'all'
              ? { label: 'Crear cápsula', onClick: () => navigate('/admin/capsulas/nueva') }
              : undefined
          }
        />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Estado</th>
                <th scope="col" className={styles.numeric}>Precio</th>
                <th scope="col">Actualizada</th>
                <th scope="col" className={styles.actionsCol}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.slug} className={!p.active ? styles.rowInactive : ''}>
                  <td>
                    <div className={styles.titleCell}>
                      <span className={styles.titleText} title={p.title}>{p.title}</span>
                      <span className={styles.slugText}>{p.slug}</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant={p.active ? 'success' : 'neutral'}>
                      {p.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className={styles.numeric}>
                    {formatCurrency(p.price, p.currency)}
                  </td>
                  <td className={styles.dateCell}>{formatDate(p.updatedAt)}</td>
                  <td className={styles.actionsCol}>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/capsulas/${p.slug}/editar`)}
                        className={styles.iconBtn}
                        title="Editar"
                        aria-label={`Editar ${p.title}`}
                      >
                        <Edit2 size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openToggleConfirm(p)}
                        className={styles.iconBtn}
                        title={p.active ? 'Desactivar' : 'Activar'}
                        aria-label={`${p.active ? 'Desactivar' : 'Activar'} ${p.title}`}
                      >
                        {p.active ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmToggle.open}
        title={confirmToggle.nextActive ? '¿Activar cápsula?' : '¿Desactivar cápsula?'}
        message={
          confirmToggle.nextActive
            ? `"${confirmToggle.product?.title}" va a volver a estar disponible en el sitio público.`
            : `"${confirmToggle.product?.title}" no va a aparecer más en el sitio público. Los pagos existentes no se afectan.`
        }
        confirmLabel={confirmToggle.nextActive ? 'Sí, activar' : 'Sí, desactivar'}
        variant={confirmToggle.nextActive ? 'default' : 'danger'}
        loading={confirmToggle.loading}
        onConfirm={handleToggleConfirm}
        onCancel={closeToggleConfirm}
      />

      <Toast {...toast.props} />
    </>
  );
}

export default Capsulas;