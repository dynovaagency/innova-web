import { getCategoryIcon } from '../../lib/categoryIcons.js';
import styles from './CategoryIcon.module.css';

/**
 * Ícono circular con la categoría de la cápsula.
 *
 * Props:
 *   - category: string.
 *   - size: 'sm' | 'md'. Default 'sm'.
 */
function CategoryIcon({ category, size = 'sm' }) {
  const Icon = getCategoryIcon(category);
  const iconPx = size === 'md' ? 22 : 18;

  return (
    <span
      className={`${styles.icon} ${styles[`icon_${size}`]}`}
      aria-label={category ? `Categoría: ${category}` : 'Categoría'}
      title={category || undefined}
    >
      <Icon size={iconPx} aria-hidden="true" />
    </span>
  );
}

export default CategoryIcon;