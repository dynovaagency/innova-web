import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import styles from './FiltersOrderModal.module.css';

/**
 * Modal de filtros y orden del listado público de cápsulas.
 *
 * Props:
 *   - open: boolean.
 *   - onClose: () => void.
 *   - value: { sort: 'newest' | 'price_desc' | 'price_asc', category: string }.
 *   - onApply: (nextValue) => void.
 *   - categories: array de strings (categorías disponibles del catálogo).
 */

const SORT_OPTIONS = [
  { value: 'newest', label: 'Última publicada' },
  { value: 'price_desc', label: 'Precio: Mayor a menor' },
  { value: 'price_asc', label: 'Precio: Menor a mayor' },
];

const emptyValue = { sort: 'newest', category: '' };

function FiltersOrderModal({ open, onClose, value, onApply, categories = [] }) {
  const [draft, setDraft] = useState(value || emptyValue);

  useEffect(() => {
    if (open) setDraft(value || emptyValue);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleClear = () => setDraft(emptyValue);
  const handleApply = () => {
    onApply(draft);
    onClose?.();
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="filters-title" className={styles.title}>Filtros y Orden</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Cerrar"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.body}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Ordenar por</legend>
            <div className={styles.radioGroup}>
              {SORT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`${styles.radioOption} ${draft.sort === opt.value ? styles.radioOption_selected : ''}`}
                >
                  <input
                    type="radio"
                    name="sort"
                    value={opt.value}
                    checked={draft.sort === opt.value}
                    onChange={() => setDraft((d) => ({ ...d, sort: opt.value }))}
                    className={styles.radioInput}
                  />
                  <span className={styles.radioMark} aria-hidden="true" />
                  <span className={styles.radioLabel}>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Categoría</legend>
            <select
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              className={styles.select}
            >
              <option value="">Todas</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </fieldset>
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={handleClear} className={styles.clearBtn}>
            Limpiar todo
          </button>
          <button type="button" onClick={handleApply} className={styles.applyBtn}>
            Ver resultados
          </button>
        </div>
      </div>
    </div>
  );
}

export default FiltersOrderModal;