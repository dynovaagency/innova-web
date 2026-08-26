import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import KpiCard from '../../components/admin/KpiCard.jsx';
import RecentPaymentsTable from '../../components/admin/RecentPaymentsTable.jsx';
import CoursesDistribution from '../../components/admin/CoursesDistribution.jsx';
import { formatCurrency, formatNumber, formatDateTime } from '../../lib/format.js';
import styles from './Dashboard.module.css';

/**
 * Dashboard del panel admin.
 *
 * Muestra:
 *   - 3 KPIs principales (facturación mes, cantidad mes, facturación total).
 *   - Últimas 5 compras aprobadas.
 *   - Distribución de ventas del mes por curso.
 *
 * Todos los datos vienen del mismo endpoint (admin-dashboard-stats) para
 * evitar 3 requests en paralelo y mantener consistencia temporal (todos
 * los KPIs son del mismo snapshot).
 */
function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/admin-dashboard-stats', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('[Dashboard] fetch error:', err);
      setError(err.message || 'Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          subtitle="Resumen general de la actividad del sitio."
        />
        <LoadingState message="Calculando estadísticas..." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          subtitle="Resumen general de la actividad del sitio."
        />
        <ErrorState
          title="No pudimos cargar los datos"
          message={error}
          action={{ label: 'Reintentar', onClick: fetchStats }}
        />
      </>
    );
  }

  const { kpis, recentPayments, coursesDistribution, generatedAt } = data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general de la actividad del sitio."
      />

      <section aria-labelledby="kpi-section-heading">
        <h2 id="kpi-section-heading" className={styles.sectionTitle}>
          KPIs principales
        </h2>
        <div className={styles.kpiGrid}>
          <KpiCard
            label="Ingresos del mes"
            value={formatCurrency(kpis.currentMonth.revenue, kpis.currentMonth.currency)}
            delta={kpis.revenueDelta}
          />
          <KpiCard
            label="Pagos aprobados del mes"
            value={formatNumber(kpis.currentMonth.count)}
            delta={kpis.countDelta}
          />
          <KpiCard
            label="Ingresos totales"
            value={formatCurrency(kpis.total.revenue, kpis.total.currency)}
            delta={null}
          />
        </div>
      </section>

      <section aria-labelledby="recent-section-heading" className={styles.section}>
        <h2 id="recent-section-heading" className={styles.sectionTitle}>
          Últimas compras
        </h2>
        <RecentPaymentsTable payments={recentPayments} />
      </section>

      <section aria-labelledby="distribution-section-heading" className={styles.section}>
        <h2 id="distribution-section-heading" className={styles.sectionTitle}>
          Distribución de ventas del mes
        </h2>
        <CoursesDistribution courses={coursesDistribution} />
      </section>

      {generatedAt && (
        <p className={styles.timestamp}>
          Actualizado: {formatDateTime(generatedAt)}
        </p>
      )}
    </>
  );
}

export default Dashboard;