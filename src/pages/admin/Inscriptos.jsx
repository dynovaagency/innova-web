import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Download, Filter, X, Search } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import EmptyState from '../../components/admin/EmptyState.jsx';
import Pagination from '../../components/admin/Pagination.jsx';
import Toast from '../../components/admin/Toast.jsx';
import useToast from '../../hooks/useToast.js';
import { formatCurrency, formatDateTime } from '../../lib/format.js';
import styles from './Inscriptos.module.css';

/**
 * Vista de listado de inscriptos.
 *
 * Un "inscripto" es un pago con status === 'approved'. Fuente de datos:
 * el mismo repo de payments, filtrado.
 *
 * Filtros:
 *   - Curso (dropdown, default "Todos")
 *   - Rango de fechas (desde/hasta)
 *   - Email (substring)
 *
 * Acciones:
 *   - Exportar CSV con los filtros aplicados.
 */

const PAGE_SIZE = 20;

function Inscriptos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [exporting, setExporting] = useState(false);

  // Estado local de los filtros en edición (draft)
  const [draft, setDraft] = useState({
    cursoSlug: searchParams.get('cursoSlug') || '',
    email: searchParams.get('email') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  });

  const applied = {
    cursoSlug: searchParams.get('cursoSlug') || '',
    email: searchParams.get('email') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  };
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);

  const hasActiveFilters = Object.values(applied).some((v) => v);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      Object.entries(applied).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await fetch(
        `/.netlify/functions/admin-enrollments-list?${params.toString()}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('[Inscriptos] fetch error:', err);
      setError(err.message || 'Error cargando inscriptos');
    } finally {
      setLoading(false);
    }
  }, [page, applied.cursoSlug, applied.email, applied.dateFrom, applied.dateTo]);

  // Cargar productos para el dropdown
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
        console.warn('[Inscriptos] no se pudo cargar catálogo:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  // Sincronizar draft cuando cambian los applied desde afuera (ej. clear)
  useEffect(() => {
    setDraft(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied.cursoSlug, applied.email, applied.dateFrom, applied.dateTo]);

  const applyFilters = (e) => {
    e?.preventDefault();
    const next = new URLSearchParams();
    Object.entries(draft).forEach(([k, v]) => {
      if (v) next.set(k, v);
    });
    setSearchParams(next);
  };

  const clearFilters = () => {
    setDraft({ cursoSlug: '', email: '', dateFrom: '', dateTo: '' });
    setSearchParams(new URLSearchParams());
  };

  const changePage = (nextPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(nextPage));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      Object.entries(applied).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await fetch(
        `/.netlify/functions/admin-enrollments-export?${params.toString()}`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error: ${res.status}`);
      }

      // Obtener filename del header o generar uno
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1] : 'inscriptos.csv';

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        'Exportación lista',
        `Se descargó ${filename} con ${data?.pagination.total || 0} inscriptos.`
      );
    } catch (err) {
      console.error('[Inscriptos] export error:', err);
      toast.error('No se pudo exportar', err.message);
    } finally {
      setExporting(false);
    }
  };

  const canExport = !loading && !exporting && data && data.pagination.total > 0;

  return (
    <>
      <PageHeader
        title="Inscriptos"
        subtitle="Listado de inscripciones confirmadas (pagos aprobados)."
        actions={
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport}
            className={styles.exportBtn}
            title={
              !canExport
                ? 'No hay inscriptos para exportar'
                : 'Descargar CSV con los inscriptos filtrados'
            }
          >
            <Download size={16} aria-hidden="true" />
            {exporting ? 'Generando CSV...' : 'Exportar CSV'}
          </button>
        }
      />

      <form onSubmit={applyFilters} className={styles.filters}>
        <div className={styles.filtersHeader}>
          <span className={styles.filtersTitle}>
            <Filter size={16} aria-hidden="true" />
            Filtros
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className={styles.clearBtn}
              disabled={loading}
            >
              <X size={14} aria-hidden="true" />
              Limpiar
            </button>
          )}
        </div>

        <div className={styles.filtersGrid}>
          <div className={styles.field}>
            <label htmlFor="filter-curso" className={styles.label}>Curso</label>
            <select
              id="filter-curso"
              value={draft.cursoSlug}
              onChange={(e) => setDraft((d) => ({ ...d, cursoSlug: e.target.value }))}
              className={styles.input}
              disabled={loading}
            >
              <option value="">Todos los cursos</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>{p.title}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="filter-dateFrom" className={styles.label}>Desde</label>
            <input
              id="filter-dateFrom"
              type="date"
              value={draft.dateFrom}
              onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="filter-dateTo" className={styles.label}>Hasta</label>
            <input
              id="filter-dateTo"
              type="date"
              value={draft.dateTo}
              onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="filter-email" className={styles.label}>Email</label>
            <div className={styles.inputWithIcon}>
              <Search size={14} aria-hidden="true" className={styles.inputIcon} />
              <input
                id="filter-email"
                type="text"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                className={styles.input}
                disabled={loading}
                placeholder="ej: felix"
              />
            </div>
          </div>
        </div>

        <div className={styles.filtersActions}>
          <button type="submit" className={styles.applyBtn} disabled={loading}>
            Aplicar filtros
          </button>
        </div>
      </form>

      {loading ? (
        <LoadingState message="Cargando inscriptos..." />
      ) : error ? (
        <ErrorState
          title="No pudimos cargar los inscriptos"
          message={error}
          action={{ label: 'Reintentar', onClick: fetchEnrollments }}
        />
      ) : !data || data.enrollments.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay inscriptos que mostrar"
          message={
            hasActiveFilters
              ? 'Probá ajustar o limpiar los filtros aplicados.'
              : 'Cuando alguien compre una cápsula, va a aparecer acá.'
          }
        />
      ) : (
        <>
          <p className={styles.resultCount}>
            <strong>{data.pagination.total}</strong>{' '}
            {data.pagination.total === 1 ? 'inscripto' : 'inscriptos'} en total
          </p>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Curso</th>
                  <th scope="col">Fecha de inscripción</th>
                  <th scope="col" className={styles.numeric}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.enrollments.map((e) => (
                  <tr key={e.externalReference}>
                    <td className={styles.emailCol}>
                      <span title={e.email}>{e.email || '—'}</span>
                    </td>
                    <td className={styles.courseCol}>
                      <span title={e.productTitle}>{e.productTitle}</span>
                    </td>
                    <td className={styles.dateCol}>
                      {formatDateTime(e.approvedAt || e.createdAt)}
                    </td>
                    <td className={`${styles.numeric} ${styles.amountCol}`}>
                      {formatCurrency(e.amount, e.currency)}
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

      <Toast {...toast.props} />
    </>
  );
}

export default Inscriptos;