import { useEffect, useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { BookOpen, ExternalLink, Video, Calendar, Search } from 'lucide-react';
import styles from './MisCursos.module.css';

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'capsula', label: 'Cápsulas' },
  { id: 'curso', label: 'Cursos' },
];

/**
 * Página "Mis cursos" del panel de alumno.
 *
 * Muestra el listado de compras aprobadas del usuario logueado con
 * acceso directo al contenido de cada uno (Genially embebido o
 * link externo tipo Meet).
 *
 * Los datos vienen del endpoint /user-purchases filtrado por email.
 * Cuando en Fase 6 se linkeen las compras a user_id, cambiar el
 * criterio de match.
 */
function MisCursos() {
  const { profile } = useOutletContext();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

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
        console.error('[MisCursos] error:', err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (profile?.email) fetchPurchases();
    return () => { cancelled = true; };
  }, [profile?.email]);

  // Filtro por modalidad + búsqueda por título
  const filteredPurchases = useMemo(() => {
    let filtered = purchases;

    if (activeFilter !== 'all') {
      filtered = filtered.filter((p) => p.modalidad === activeFilter);
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) => p.productTitle?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [purchases, activeFilter, search]);

  const capsulasCount = purchases.filter((p) => p.modalidad === 'capsula').length;
  const cursosCount = purchases.filter((p) => p.modalidad === 'curso').length;

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Estado inicial de carga
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Cargando tus cursos...</p>
        </div>
      </div>
    );
  }

  // Error de red
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p className={styles.errorTitle}>No pudimos cargar tus cursos</p>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  // Sin compras
  if (purchases.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <BookOpen size={48} />
          </div>
          <h2 className={styles.emptyTitle}>Todavía no tenés cursos</h2>
          <p className={styles.emptyText}>
            Explorá nuestro catálogo y encontrá la formación que se ajuste a tus intereses profesionales.
          </p>
          <Link to="/servicios" className={styles.emptyBtn}>
            Ver catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Mis cursos</h1>
          <p className={styles.subtitle}>
            Todos los cursos y cápsulas que compraste. Accedé cuando quieras.
          </p>
        </div>
      </header>

      {/* Filtros y búsqueda (solo si hay más de 1 compra) */}
      {purchases.length > 1 && (
        <div className={styles.controls}>
          <div className={styles.tabs} role="tablist">
            {FILTERS.map((f) => {
              const count =
                f.id === 'all' ? purchases.length
                : f.id === 'capsula' ? capsulasCount
                : cursosCount;

              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={
                    activeFilter === f.id
                      ? `${styles.tab} ${styles.tabActive}`
                      : styles.tab
                  }
                >
                  {f.label}
                  <span className={styles.tabCount}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título..."
              className={styles.searchInput}
            />
          </div>
        </div>
      )}

      {/* Grid de cursos */}
      {filteredPurchases.length === 0 ? (
        <div className={styles.noResults}>
          <p>No encontramos cursos que coincidan con tu búsqueda.</p>
          <button
            type="button"
            onClick={() => { setSearch(''); setActiveFilter('all'); }}
            className={styles.clearBtn}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredPurchases.map((purchase) => (
            <CourseCard
              key={purchase.externalReference}
              purchase={purchase}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Card individual de un curso comprado.
 */
function CourseCard({ purchase, formatDate }) {
  const {
    externalReference,
    cursoSlug,
    productTitle,
    imageUrl,
    contentType,
    contentUrl,
    modalidad,
    category,
    approvedAt,
    createdAt,
  } = purchase;

  const modalidadLabel = modalidad === 'capsula' ? 'Cápsula' : 'Curso';
  const purchaseDate = formatDate(approvedAt || createdAt);

  // Determinar cómo abrir el contenido
  // - Genially embebido: /curso/[slug]?ref=[ref] (ruta interna que muestra iframe)
  // - Link externo (Meet, YouTube, etc): abre en nueva pestaña
  const isExternal = contentType === 'external_link';
  const accessUrl = isExternal
    ? contentUrl
    : `/curso/${cursoSlug}?ref=${externalReference}`;

  return (
    <article className={styles.card}>
      <div className={styles.cardImage}>
        {imageUrl ? (
          <img src={imageUrl} alt={productTitle} loading="lazy" />
        ) : (
          <div className={styles.cardImagePlaceholder} aria-hidden="true">
            <BookOpen size={40} />
          </div>
        )}
        <span className={styles.cardBadge}>{modalidadLabel}</span>
      </div>

      <div className={styles.cardBody}>
        {category && <p className={styles.cardCategory}>{category}</p>}
        <h3 className={styles.cardTitle}>{productTitle}</h3>

        <div className={styles.cardMeta}>
          <span className={styles.metaItem}>
            <Calendar size={14} aria-hidden="true" />
            Comprado el {purchaseDate}
          </span>
        </div>

        {isExternal ? (
          <a
            href={accessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cardBtn}
          >
            <ExternalLink size={16} aria-hidden="true" />
            Ir al contenido
          </a>
        ) : (
          <Link to={accessUrl} className={styles.cardBtn}>
            <Video size={16} aria-hidden="true" />
            Ver contenido
          </Link>
        )}
      </div>
    </article>
  );
}

export default MisCursos;