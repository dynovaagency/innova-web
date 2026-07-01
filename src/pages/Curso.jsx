import { useParams, Link, Navigate } from 'react-router-dom';
import { getCursoBySlug } from '../data/cursos.js';
import styles from './Curso.module.css';

/**
 * Página del curso — muestra la cápsula embebida en un iframe de Genially.
 *
 * IMPORTANTE — visibilidad:
 *   - La ruta /curso/:slug no está enlazada desde el menú ni el footer.
 *   - Solo se llega vía redirect de Mercado Pago después de un pago exitoso.
 *   - netlify.toml y robots.txt tienen reglas para evitar indexación de /curso/*.
 *
 * IMPORTANTE — seguridad (MVP):
 *   - En este momento no hay verificación de pago. Cualquiera con el link puede
 *     acceder al contenido. Esto se resuelve en Fase 2 con auth + backend.
 */
function Curso() {
  const { slug } = useParams();
  const curso = getCursoBySlug(slug);

  // Si el slug no existe en el catálogo, redirigimos al home.
  if (!curso) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerOverlay} aria-hidden="true" />
        <div className={styles.headerContent}>
          <nav className={styles.breadcrumb} aria-label="Migas de pan">
            <Link to="/">INICIO</Link>
            <span aria-hidden="true">›</span>
            <span>ACCESO AL CURSO</span>
          </nav>
          <span className={styles.headerTag}>{curso.subtitle.toUpperCase()}</span>
          <h1 className={styles.headerTitle}>{curso.title}</h1>
          <p className={styles.headerDescription}>
            Bienvenido/a. Ya podés comenzar la cápsula. Podés navegar por el contenido a tu ritmo,
            volver cuando quieras y usar el modo pantalla completa para una mejor experiencia.
          </p>
        </div>
      </header>

      <section className={styles.body}>
        <div className={styles.iframeWrapper}>
          <iframe
            src={curso.geniallyUrl}
            title={curso.title}
            className={styles.iframe}
            allow="fullscreen; accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>

        <div className={styles.support}>
          <p>
            ¿Tenés problemas para visualizar la cápsula? Escribinos y te ayudamos:{' '}
            <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.supportLink}>
              innovatrabajosocial@trabajosocial.ar
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

export default Curso;
