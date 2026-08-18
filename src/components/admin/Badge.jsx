import styles from './Badge.module.css';

/**
 * Badge visual para estados.
 *
 * Props:
 *   - variant: 'success' | 'neutral' | 'danger' | 'warning'
 *   - children: contenido (típicamente texto corto).
 */
function Badge({ variant = 'neutral', children }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${variant}`]}`}>
      {children}
    </span>
  );
}

export default Badge;