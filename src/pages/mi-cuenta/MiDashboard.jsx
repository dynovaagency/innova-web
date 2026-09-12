import { useEffect, useState } from 'react';
import { Link, useOutletContext, useLocation } from 'react-router-dom';
import { BookOpen, Calendar, ArrowRight } from 'lucide-react';
import styles from './MiDashboard.module.css';

/**
 * Dashboard del panel de alumno.
 *
 * Muestra cards de resumen:
 *   - Bienvenida personalizada.
 *   - Cursos activos (cantidad de compras aprobadas).
 *   - Última compra (fecha).
 *
 * Datos vienen del endpoint /user-purchases que filtra por email.
 */
function MiDashboard() {
  const { profile } = useOutletContext();
  const location = useLocation();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passwordChangedBanner, setPasswordChangedBanner] = useState(
    location.state?.passwordChanged || false
  );

  useEffect(() => {
    let cancelled = false;

    const fetchPurchases = async () => {
      try {
        const res = await fetch('/.netlify/functions/user-purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: profile?.email }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setPurchases(data.purchases || []);
        }
      } catch (err) {
        console.error('[MiDashboard] error:', err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (profile?.email) fetchPurchases();

    return () => { cancelled = true; };
  }, [profile?.email]);

  const activeCourses = purchases.length;
  const lastPurchase = purchases[0];

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.dashboard}>
      {passwordChangedBanner && (
        <div className={styles.successBanner} role="status">
          <span>✓ Contraseña actualizada correctamente.</span>
          <button
            type="button"
            onClick={() => setPasswordChangedBanner(false)}
            className={styles.bannerClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}
      <div className={styles.welcomeCard}>
        <h1 className={styles.welcomeTitle}>¡Bienvenido/a a tu espacio de INNOVA!</h1>
        <p className={styles.welcomeText}>
          Desde acá vas a poder acceder a tus cursos comprados, actualizar tus datos personales
          y gestionar tu cuenta.
        </p>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} aria-hidden="true">
            <BookOpen size={24} />
          </div>
          <div className={styles.kpiBody}>
            <p className={styles.kpiLabel}>Cursos activos</p>
            <p className={styles.kpiValue}>
              {loading ? '…' : activeCourses}
            </p>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} aria-hidden="true">
            <Calendar size={24} />
          </div>
          <div className={styles.kpiBody}>
            <p className={styles.kpiLabel}>Última compra</p>
            <p className={styles.kpiValueSmall}>
              {loading ? '…' : formatDate(lastPurchase?.approvedAt || lastPurchase?.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {!loading && activeCourses > 0 && (
        <div className={styles.ctaCard}>
          <div>
            <h2 className={styles.ctaTitle}>Continúa tu formación</h2>
            <p className={styles.ctaText}>
              Accedé a tus {activeCourses === 1 ? 'curso' : 'cursos'} desde la sección &quot;Mis cursos&quot;.
            </p>
          </div>
          <Link to="/mi-cuenta/mis-cursos" className={styles.ctaBtn}>
            Ver mis cursos
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}

      {!loading && activeCourses === 0 && (
        <div className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>Todavía no tenés cursos</h2>
          <p className={styles.emptyText}>
            Explorá nuestro catálogo y encontrá la formación que te interesa.
          </p>
          <Link to="/servicios" className={styles.emptyBtn}>
            Ver catálogo
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}

      {error && (
        <p className={styles.errorMessage}>
          No pudimos cargar los datos: {error}
        </p>
      )}
    </div>
  );
}

export default MiDashboard;