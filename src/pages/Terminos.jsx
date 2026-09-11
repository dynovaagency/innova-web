import { Link } from 'react-router-dom';
import styles from './Terminos.module.css';

/**
 * Página de Términos y Condiciones (placeholder).
 *
 * Innova todavía no proporcionó el texto oficial. Cuando lo hagan,
 * reemplazamos el contenido de esta página.
 */
function Terminos() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Términos y Condiciones</h1>
        <p className={styles.paragraph}>
          Los Términos y Condiciones de uso de INNOVA Trabajo Social se encuentran en actualización.
          Muy pronto vamos a publicar la versión definitiva.
        </p>
        <p className={styles.paragraph}>
          Si tenés alguna consulta sobre el tratamiento de tus datos o las condiciones de uso de la plataforma,
          podés escribirnos a{' '}
          <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.link}>
            innovatrabajosocial@trabajosocial.ar
          </a>
          .
        </p>
        <p className={styles.paragraph}>
          <Link to="/" className={styles.link}>Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
}

export default Terminos;