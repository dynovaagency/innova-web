import styles from './PageHeader.module.css';

/**
 * Encabezado consistente para cada página del panel.
 *
 * Props:
 *   - title: string. Título grande.
 *   - subtitle: string opcional. Descripción corta.
 *   - actions: ReactNode opcional. Botones u otros elementos alineados a la derecha.
 */
function PageHeader({ title, subtitle, actions }) {
  return (
    <header className={styles.header}>
      <div className={styles.textBlock}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

export default PageHeader;