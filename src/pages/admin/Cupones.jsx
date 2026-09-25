import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Ticket } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import Badge from '../../components/admin/Badge.jsx';
import { formatCurrency } from '../../lib/format.js';
import {
  COUPON_STATUS,
  formatDiscount,
  formatUses,
  formatValidity,
} from './couponUtils.js';
import styles from './Cupones.module.css';

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'scheduled', label: 'Programados' },
  { id: 'expired', label: 'Vencidos' },
  { id: 'exhausted', label: 'Agotados' },
  { id: 'inactive', label: 'Inactivos' },
];

/**
 * Listado de cupones del panel admin.
 */
function Cupones() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/admin-coupons-list', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      console.error('[Cupones] fetch error:', err);
      setError(err.message || 'Error cargando cupones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const counts = useMemo(() => {
    const c = { all: coupons.length };
    for (const coupon of coupons) {
      c[coupon.status] = (c[coupon.status] || 0) + 1;
    }
    return c;
  }, [coupons]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return coupons.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (!term) return true;
      return (
        c.code.toLowerCase().includes(term) ||
        (c.description || '').toLowerCase().includes(term)
      );
    });
  }, [coupons, filter, search]);

  const goToDetail = (id) => navigate(`/admin/cupones/${id}`);

  const headerActions = (
    <Link to="/admin/cupones/nuevo" className={styles.primaryBtn}>
      <Plus size={16} aria-hidden="true" />
      Nuevo cupón
    </Link>
  );

  if (loading) {
    return (
      <>
        <PageHeader title="Cupones" subtitle="Códigos de descuento" actions={headerActions} />
        <LoadingState message="Cargando cupones..." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Cupones" subtitle="Códigos de descuento" actions={headerActions} />
        <ErrorState
          title="No pudimos cargar los cupones"
          message={error}
          action={{ label: 'Reintentar', onClick: fetchCoupons }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Cupones"
        subtitle="Creá y administrá códigos de descuento para cápsulas y cursos."
        actions={headerActions}
      />

      {coupons.length === 0 ? (
        <div className={styles.emptyState}>
          <Ticket size={40} aria-hidden="true" />
          <h2 className={styles.emptyTitle}>Todavía no hay cupones</h2>
          <p className={styles.emptyText}>
            Creá el primero para ofrecer descuentos por porcentaje o monto fijo.
          </p>
          <Link to="/admin/cupones/nuevo" className={styles.primaryBtn}>
            <Plus size={16} aria-hidden="true" />
            Crear cupón
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.controls}>
            <div className={styles.tabs} role="tablist">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={filter === f.id ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                >
                  {f.label}
                  <span className={styles.tabCount}>{counts[f.id] || 0}</span>
                </button>
              ))}
            </div>

            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código o descripción..."
                className={styles.searchInput}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className={styles.noResults}>No hay cupones que coincidan con el filtro.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descuento</th>
                    <th>Vigencia</th>
                    <th>Usos</th>
                    <th>Total descontado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const status = COUPON_STATUS[c.status] || COUPON_STATUS.inactive;
                    return (
                      <tr
                        key={c.id}
                        className={styles.row}
                        onClick={() => goToDetail(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') goToDetail(c.id);
                        }}
                        tabIndex={0}
                      >
                        <td>
                          <span className={styles.codeText}>{c.code}</span>
                          {c.description && (
                            <span className={styles.codeDesc}>{c.description}</span>
                          )}
                        </td>
                        <td className={styles.strong}>{formatDiscount(c)}</td>
                        <td>{formatValidity(c)}</td>
                        <td>{formatUses(c)}</td>
                        <td>{formatCurrency(c.totalDiscounted, 'ARS')}</td>
                        <td>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default Cupones;