import { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import styles from './PaymentFilters.module.css';

/**
 * Panel de filtros para la lista de pagos.
 *
 * Props:
 *   - value: objeto con los filtros actuales (source of truth de arriba).
 *   - onChange: (nextFilters) => void. Se llama al aplicar filtros.
 *   - onClear: () => void. Se llama al limpiar todos.
 *   - products: array de { slug, title } para el dropdown de curso.
 *   - disabled: boolean opcional.
 *
 * Diseño:
 *   Estado interno para los valores en edición. Cuando el usuario hace
 *   click en "Aplicar" o presiona Enter, se propaga al padre vía onChange.
 *   Los filtros de búsqueda por email o externalReference tienen
 *   debounce implícito porque solo aplican al submit.
 */

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'rejected', label: 'Rechazados' },
];

const emptyFilters = {
  status: '',
  cursoSlug: '',
  email: '',
  externalReference: '',
  dateFrom: '',
  dateTo: '',
};

function PaymentFilters({ value, onChange, onClear, products = [], disabled = false }) {
  // Estado local (edición) vs. value externo (aplicado).
  // Cuando value cambia desde afuera (ej. clear), sincronizamos el estado local.
  const [draft, setDraft] = useState(value || emptyFilters);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDraft(value || emptyFilters);
  }, [value]);

  const handleFieldChange = (field) => (e) => {
    setDraft((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    onChange(draft);
  };

  const handleClear = () => {
    setDraft(emptyFilters);
    onClear();
  };

  const hasActiveFilters = Object.values(value || {}).some((v) => v && v !== '');
  const activeCount = Object.values(value || {}).filter((v) => v && v !== '').length;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.headerRow}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={styles.toggleBtn}
          aria-expanded={expanded}
        >
          <Filter size={16} aria-hidden="true" />
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className={styles.badge}>{activeCount}</span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearBtn}
            disabled={disabled}
          >
            <X size={14} aria-hidden="true" />
            Limpiar filtros
          </button>
        )}
      </div>

      {expanded && (
        <div className={styles.body}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="filter-status" className={styles.label}>Estado</label>
              <select
                id="filter-status"
                value={draft.status}
                onChange={handleFieldChange('status')}
                className={styles.input}
                disabled={disabled}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="filter-curso" className={styles.label}>Curso</label>
              <select
                id="filter-curso"
                value={draft.cursoSlug}
                onChange={handleFieldChange('cursoSlug')}
                className={styles.input}
                disabled={disabled}
              >
                <option value="">Todos</option>
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
                onChange={handleFieldChange('dateFrom')}
                className={styles.input}
                disabled={disabled}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="filter-dateTo" className={styles.label}>Hasta</label>
              <input
                id="filter-dateTo"
                type="date"
                value={draft.dateTo}
                onChange={handleFieldChange('dateTo')}
                className={styles.input}
                disabled={disabled}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="filter-email" className={styles.label}>Email del comprador</label>
              <div className={styles.inputWithIcon}>
                <Search size={14} aria-hidden="true" className={styles.inputIcon} />
                <input
                  id="filter-email"
                  type="text"
                  value={draft.email}
                  onChange={handleFieldChange('email')}
                  className={styles.input}
                  disabled={disabled}
                  placeholder="ej: felix"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="filter-ref" className={styles.label}>Referencia externa</label>
              <div className={styles.inputWithIcon}>
                <Search size={14} aria-hidden="true" className={styles.inputIcon} />
                <input
                  id="filter-ref"
                  type="text"
                  value={draft.externalReference}
                  onChange={handleFieldChange('externalReference')}
                  className={styles.input}
                  disabled={disabled}
                  placeholder="inv_..."
                />
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.applyBtn}
              disabled={disabled}
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export default PaymentFilters;