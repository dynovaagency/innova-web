import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import EmptyState from '../../components/admin/EmptyState.jsx';
import Badge from '../../components/admin/Badge.jsx';
import Pagination from '../../components/admin/Pagination.jsx';
import PaymentFilters from '../../components/admin/PaymentFilters.jsx';
import { formatCurrency, formatDateTime } from '../../lib/format.js';
import styles from './Pagos.module.css';

/**
 * Vista de listado de pagos.
 *
 * Los filtros y la página se sincronizan con la query string de la URL,
 * para que Paola pueda bookmarkear o compartir búsquedas específicas.
 * Ej: /admin/pagos?status=approved&email=felix&page=2
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

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);

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
    try {
      // Construir query string con los filtros no vacíos
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await fetch(
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
        const res = await fetch('/.netlify/functions/admin-products-list', {
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
    navigate(`/admin/pagos/${encodeURIComponent(ref)}`);
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
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
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
                    className={styles.row}
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
    </>
  );
}

export default Pagos;