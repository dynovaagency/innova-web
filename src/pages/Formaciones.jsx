import { Link } from 'react-router-dom';
import styles from './Formaciones.module.css';

/**
 * Página Formaciones — espacios prácticos orientados al trabajo con
 * herramientas, casos, recursos o dispositivos de intervención.
 *
 * Estructura placeholder: header igual al de las otras secciones internas
 * (azul + breadcrumb + pill + título). El contenido principal queda
 * pendiente de definición por Innova.
 */
function Formaciones() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerOverlay} aria-hidden="true" />
        <div className={styles.headerContent}>
          <nav className={styles.breadcrumb} aria-label="Migas de pan">
            <Link to="/">INICIO</Link>
            <span aria-hidden="true">›</span>
            <span>FORMACIONES</span>
          </nav>
          <span className={styles.headerTag}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="8" r="6" />
            </svg>
            HERRAMIENTAS Y CASOS
          </span>
          <h1 className={styles.headerTitle}>Formaciones</h1>
          <p className={styles.headerDescription}>
            Espacios prácticos orientados al trabajo con herramientas, casos, recursos o
            dispositivos de intervención.
          </p>
        </div>
      </header>

      <section className={styles.body}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Próximamente</h2>
          <p className={styles.cardText}>
            Estamos preparando los contenidos de esta sección. Pronto vas a encontrar acá
            propuestas de formación práctica, casos de estudio y dispositivos de intervención
            para profesionales del Trabajo Social.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Formaciones;
