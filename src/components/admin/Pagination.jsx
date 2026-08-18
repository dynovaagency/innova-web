import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

/**
 * Componente de paginación clásica.
 *
 * Props:
 *   - page: número de página actual (1-indexed).
 *   - pageSize: cantidad por página.
 *   - total: total de items.
 *   - totalPages: total de páginas.
 *   - onPageChange: (nextPage) => void
 *   - disabled: boolean opcional. Deshabilita botones (durante loading).
 */
function Pagination({ page, pageSize, total, totalPages, onPageChange, disabled = false }) {
  if (total === 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const canPrev = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled;

  return (
    <div className={styles.container}>
      <p className={styles.summary}>
        Mostrando <strong>{startItem}</strong>–<strong>{endItem}</strong> de{' '}
        <strong>{total}</strong>
      </p>

      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          className={styles.pageBtn}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Anterior</span>
        </button>

        <span className={styles.pageIndicator}>
          Página {page} de {totalPages}
        </span>

        <button
          type="button"
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          className={styles.pageBtn}
          aria-label="Página siguiente"
        >
          <span>Siguiente</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;