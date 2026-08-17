import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { useProductsCatalog } from '../hooks/useProductsCatalog.js';
import CapsulaCard from '../components/capsulas/CapsulaCard.jsx';
import CapsulaCardFeatured from '../components/capsulas/CapsulaCardFeatured.jsx';
import FiltersOrderModal from '../components/capsulas/FiltersOrderModal.jsx';
import styles from './Capsulas.module.css';

/**
 * Página pública de listado de cápsulas y cursos.
 *
 * Layout:
 *   - Header con título y descripción.
 *   - Card destacada arriba (featured=true; si no hay, la más reciente).
 *   - Buscador de texto libre + botón "Filtros y Orden" (abre modal).
 *   - Grid 3x4 con paginación (12 por página).
 *
 * Comportamiento:
 *   - Todos los productos activos del catálogo aparecen acá.
 *   - Búsqueda: matchea title + description case-insensitive.
 *   - Ordenamiento: más reciente por defecto (por createdAt desc).
 *   - Filtro por categoría desde el modal.
 */

const PAGE_SIZE = 12;

function Capsulas() {
  const { products: allProducts, loading } = useProductsCatalog();

  // Filtramos por modalidad === 'capsula'. Los cursos se muestran en
  // /servicios/cursos, no acá.
  const products = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter((p) => p.modalidad === 'capsula');
  }, [allProducts]);

  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({ sort: 'newest', category: '' });
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Volver a página 1 cuando cambia la búsqueda o los filtros
  useEffect(() => {
    setPage(1);
  }, [searchText, filters.sort, filters.category]);

  // Elegir la cápsula destacada:
  // 1. La primera marcada featured=true, ordenada por más reciente.
  // 2. Si ninguna está featured, la más reciente del catálogo.
  const featured = useMemo(() => {
    if (!products || products.length === 0) return null;
    const featureds = products
      .filter((p) => p.featured === true)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (featureds.length > 0) return featureds[0];
    return [...products].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )[0];
  }, [products]);

  // Categorías únicas presentes en el catálogo (para el select del modal)
  const availableCategories = useMemo(() => {
    const set = new Set();
    (products || []).forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  // Grid: todos los productos activos EXCEPTO el destacado, con filtros aplicados
  const gridProducts = useMemo(() => {
    if (!products) return [];
    let result = products.filter((p) => p.slug !== featured?.slug);

    // Búsqueda por texto (title + description)
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((p) => {
        const inTitle = (p.title || '').toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        return inTitle || inDesc;
      });
    }

    // Filtro por categoría (exacto)
    if (filters.category) {
      result = result.filter(
        (p) => (p.category || '').toLowerCase() === filters.category.toLowerCase()
      );
    }

    // Ordenamiento
    if (filters.sort === 'price_desc') {
      result = [...result].sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (filters.sort === 'price_asc') {
      result = [...result].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else {
      // 'newest' por default
      result = [...result].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    }

    return result;
  }, [products, featured, searchText, filters.sort, filters.category]);

  const totalPages = Math.max(1, Math.ceil(gridProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageProducts = gridProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const hasActiveFilters = filters.category !== '' || filters.sort !== 'newest';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cápsulas Formativas</h1>
        <p className={styles.subtitle}>
          Espacios de formación cortos, específicos y a tu propio ritmo para
          potenciar tu desarrollo profesional continuo.
        </p>
      </header>

      {loading ? (
        <div className={styles.loading}>Cargando catálogo...</div>
      ) : (
        <>
          {featured && (
            <div className={styles.featuredWrap}>
              <CapsulaCardFeatured product={featured} />
            </div>
          )}

          <div className={styles.controls}>
            <div className={styles.searchWrap}>
              <Search size={18} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className={styles.searchInput}
                placeholder="Buscar por título o palabras clave..."
                aria-label="Buscar cápsulas"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersModalOpen(true)}
              className={`${styles.filtersBtn} ${hasActiveFilters ? styles.filtersBtn_active : ''}`}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filtros y Orden
              {hasActiveFilters && <span className={styles.filtersBadge} aria-hidden="true" />}
            </button>
          </div>

          {pageProducts.length === 0 ? (
            <div className={styles.empty}>
              <BookOpen size={40} aria-hidden="true" className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No encontramos cápsulas que coincidan</p>
              <p className={styles.emptyMessage}>
                Probá ajustar la búsqueda o limpiar los filtros aplicados.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {pageProducts.map((p) => (
                  <CapsulaCard key={p.slug} product={p} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Paginación">
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`${styles.pageBtn} ${n === currentPage ? styles.pageBtn_active : ''}`}
                      aria-label={`Ir a página ${n}`}
                      aria-current={n === currentPage ? 'page' : undefined}
                    >
                      {n}
                    </button>
                  ))}

                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              )}
            </>
          )}
        </>
      )}

      <FiltersOrderModal
        open={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        value={filters}
        onApply={setFilters}
        categories={availableCategories}
      />
    </div>
  );
}

export default Capsulas;