import { adminFetch } from '../../lib/adminFetch.js';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { CreditCard, Trash2, X } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import EmptyState from '../../components/admin/EmptyState.jsx';
import Badge from '../../components/admin/Badge.jsx';
import Pagination from '../../components/admin/Pagination.jsx';
import PaymentFilters from '../../components/admin/PaymentFilters.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import Toast from '../../components/admin/Toast.jsx';
import useToast from '../../hooks/useToast.js';
import { formatCurrency, formatDateTime } from '../../lib/format.js';
import styles from './Pagos.module.css';

/**
 * Vista de listado de pagos.
 *
 * Los filtros y la página se sincronizan con la query string de la URL,
 * para que Paola pueda bookmarkear o compartir búsquedas específicas.
 * Ej: /admin/pagos?status=approved&email=felix&page=2
 *
 * Al entrar al detalle de un pago se pasan los filtros actuales en el
 * state de la navegación, para que "Volver" los conserve.
 *
 * Selección múltiple (admins y superadmins): permite marcar varios pagos de
 * la página y eliminarlos juntos sin salir del listado.
 */

const PAGE_SIZE = 20;

const emptyFilters = {
  status: '',
  cursoSlug: '',
  email: '',
  externalReference: '',
  dateFrom: '',
  dateTo: '',
};

// Mapeo de estado a variant del Badge
const statusVariant = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
};

const statusLabel = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
};

function Pagos() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { admin } = useOutletContext() || {};
  const toast = useToast();
  const canDelete = ['admin', 'superadmin'].includes(admin?.role);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState({ open: false, loading: false });

  // Estado extraído de la URL
  const filters = {
    status: searchParams.get('status') || '',
    cursoSlug: searchParams.get('cursoSlug') || '',
    email: searchParams.get('email') || '',
    externalReference: searchParams.get('externalReference') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  };
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    // La selección es por página: al recargar el listado se limpia.
    setSelected(new Set());
    try {
      // Construir query string con los filtros no vacíos
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await adminFetch(
        `/.netlify/functions/admin-payments-list?${params.toString()}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('[Pagos] fetch error:', err);
      setError(err.message || 'Error cargando pagos');
    } finally {
      setLoading(false);
    }
  }, [page, filters.status, filters.cursoSlug, filters.email, filters.externalReference, filters.dateFrom, filters.dateTo]);

  // Cargar productos una vez (para el dropdown de filtro)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch('/.netlify/functions/admin-products-list', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setProducts(body.products || []);
      } catch (err) {
        console.warn('[Pagos] no se pudo cargar catálogo para filtros:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const updateFilters = (nextFilters) => {
    // Al cambiar filtros, volvemos a página 1
    const newParams = new URLSearchParams();
    Object.entries(nextFilters).forEach(([k, v]) => {
      if (v) newParams.set(k, v);
    });
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const changePage = (nextPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(nextPage));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToDetail = (ref) => {
    // Pasamos los filtros actuales para que el detalle pueda volver a
    // este mismo listado (misma búsqueda y misma página).
    navigate(`/admin/pagos/${encodeURIComponent(ref)}`, {
      state: { listSearch: searchParams.toString() },
    });
  };

  // ---------- Selección múltiple ----------

  const pagePayments = data?.payments || [];
  const allSelected = pagePayments.length > 0 && selected.size === pagePayments.length;
  const selectedApproved = pagePayments.filter(
    (p) => selected.has(p.externalReference) && p.status === 'approved'
  ).length;

  const toggleOne = (ref) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(pagePayments.map((p) => p.externalReference)));
  };

  const handleBulkDelete = async () => {
    setConfirmDelete({ open: true, loading: true });
    try {
      const res = await adminFetch('/.netlify/functions/admin-payments-bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refs: [...selected] }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'No se pudieron eliminar los pagos');

      const deletedCount = body.deleted?.length || 0;
      const failedCount = body.failed?.length || 0;
      setConfirmDelete({ open: false, loading: false });

      if (failedCount > 0) {
        toast.error(
          'Algunos pagos no se pudieron eliminar',
          `Se eliminaron ${deletedCount} y fallaron ${failedCount}. Probá de nuevo con los que quedaron.`
        );
      } else {
        toast.success(
          deletedCount === 1 ? 'Pago eliminado' : `${deletedCount} pagos eliminados`,
          'Los registros se eliminaron del sistema.'
        );
      }

      // Si borramos toda la última página, retrocedemos una.
      if (deletedCount >= pagePayments.length && page > 1) {
        changePage(page - 1);
      } else {
        fetchPayments();
      }
    } catch (err) {
      console.error('[Pagos] bulk delete error:', err);
      toast.error('No se pudo eliminar', err.message);
      setConfirmDelete({ open: false, loading: false });
    }
  };

  return (
    <>
      <PageHeader
        title="Pagos"
        subtitle="Consultá y gestioná las compras realizadas en el sitio."
      />

      <PaymentFilters
        value={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        products={products}
        disabled={loading}
      />

      {loading ? (
        <LoadingState message="Cargando pagos..." />
      ) : error ? (
        <ErrorState
          title="No pudimos cargar los pagos"
          message={error}
          action={{ label: 'Reintentar', onClick: fetchPayments }}
        />
      ) : !data || data.payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No hay pagos que mostrar"
          message={
            Object.values(filters).some((v) => v)
              ? 'Probá ajustar o limpiar los filtros aplicados.'
              : 'Cuando alguien compre una cápsula, va a aparecer acá.'
          }
        />
      ) : (
        <>
          {canDelete && selected.size > 0 && (
            <div className={styles.selectionBar} role="status">
              <span className={styles.selectionCount}>
                {selected.size === 1 ? '1 pago seleccionado' : `${selected.size} pagos seleccionados`}
              </span>
              <div className={styles.selectionActions}>
                <button
                  type="button"
                  className={styles.clearSelectionBtn}
                  onClick={() => setSelected(new Set())}
                >
                  <X size={14} aria-hidden="true" />
                  Quitar selección
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => setConfirmDelete({ open: true, loading: false })}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Eliminar seleccionados
                </button>
              </div>
            </div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {canDelete && (
                    <th scope="col" className={styles.checkCol}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Seleccionar todos los pagos de esta página"
                      />
                    </th>
                  )}
                  <th scope="col">Fecha</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Email</th>
                  <th scope="col">Curso</th>
                  <th scope="col" className={styles.numeric}>Monto</th>
                  <th scope="col">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr
                    key={p.externalReference}
                    onClick={() => goToDetail(p.externalReference)}
                    className={
                      selected.has(p.externalReference)
                        ? `${styles.row} ${styles.rowSelected}`
                        : styles.row
                    }
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goToDetail(p.externalReference);
                      }
                    }}
                    role="link"
                    aria-label={`Ver detalle del pago ${p.externalReference}`}
                  >
                    {canDelete && (
                      <td
                        className={styles.checkCol}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(p.externalReference)}
                          onChange={() => toggleOne(p.externalReference)}
                          aria-label={`Seleccionar el pago ${p.externalReference}`}
                        />
                      </td>
                    )}
                    <td className={styles.dateCol}>{formatDateTime(p.createdAt)}</td>
                    <td>
                      <Badge variant={statusVariant[p.status] || 'neutral'}>
                        {statusLabel[p.status] || p.status}
                      </Badge>
                    </td>
                    <td className={styles.emailCol}>
                      <span title={p.buyerEmail}>{p.buyerEmail || '—'}</span>
                    </td>
                    <td className={styles.courseCol}>
                      <span title={p.productTitle || p.cursoSlug}>
                        {p.productTitle || p.cursoSlug}
                      </span>
                    </td>
                    <td className={`${styles.numeric} ${styles.amountCol}`}>
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                    <td className={styles.refCol}>
                      <code>{p.externalReference}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.pagination.page}
            pageSize={data.pagination.pageSize}
            total={data.pagination.total}
            totalPages={data.pagination.totalPages}
            onPageChange={changePage}
            disabled={loading}
          />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete.open}
        title={selected.size === 1 ? '¿Eliminar este pago?' : `¿Eliminar ${selected.size} pagos?`}
        message={
          selectedApproved > 0
            ? `La selección incluye ${selectedApproved} ${selectedApproved === 1 ? 'pago aprobado' : 'pagos aprobados'}: son ventas reales y esas personas van a perder el acceso al contenido. Esta acción no se puede deshacer.`
            : 'Los registros se eliminan del sistema. Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={confirmDelete.loading}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete({ open: false, loading: false })}
      />

      <Toast {...toast.props} />
    </>
  );
}

export default Pagos;