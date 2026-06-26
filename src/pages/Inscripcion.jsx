import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import styles from './Inscripcion.module.css';

/**
 * Página Inscripción — formulario de contacto para equipos e instituciones
 * que quieren contratar formaciones, supervisiones o acompañamiento de Innova.
 *
 * Se accede desde dos lugares de la web:
 *   1. Botón "Inscripción" del navbar
 *   2. Botón "Descubre INNOVA" del banner azul de la home
 *
 * TODO Felix: el form todavía no tiene endpoint real — onSubmit es preventDefault.
 * Cuando definamos el destino (Web3Forms / Formspree / Netlify Forms / etc),
 * actualizar el handler para que efectivamente envíe.
 */

const checks = [
  'Espacio multiplataforma para profesionales del Trabajo Social.',
  'Equipo con amplia trayectoria en intervención e investigación.',
  'Acompañamiento crítico y situado con perspectiva ética.',
];

function Inscripcion() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerOverlay} aria-hidden="true" />
        <div className={styles.headerContent}>
          <nav className={styles.breadcrumb} aria-label="Migas de pan">
            <Link to="/">INICIO</Link>
            <span aria-hidden="true">›</span>
            <span>INSCRIPCIÓN</span>
          </nav>
          <span className={styles.headerTag}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="8" r="6" />
            </svg>
            EQUIPOS E INSTITUCIONES
          </span>
          <h1 className={styles.headerTitle}>Inscripción</h1>
          <p className={styles.headerDescription}>
            Contános sobre tu equipo o institución. Te respondemos a la brevedad con una propuesta
            de formación, supervisión o acompañamiento adaptada a tus necesidades.
          </p>
        </div>
      </header>

      <section className={styles.body}>
        <div className={styles.card}>
          <div className={styles.cardLeft}>
            <h2 className={styles.cardTitle}>
              Un equipo dedicado a hacer crecer tu organización
            </h2>
            <p className={styles.cardDescription}>
              Ofrecemos formaciones, supervisiones y acompañamiento institucional adaptado a
              las necesidades de tu equipo o institución.
            </p>
            <ul className={styles.checkList}>
              {checks.map((label, idx) => (
                <li key={idx} className={styles.checkItem}>
                  <span className={styles.checkIcon} aria-hidden="true">
                    <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                      <path d="M6 10.5 L9 13.5 L14.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <form className={styles.cardRight} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.formRow}>
              <label className={styles.formField}>
                <span>Nombre</span>
                <input type="text" placeholder="Nombre" required />
              </label>
              <label className={styles.formField}>
                <span>Apellido</span>
                <input type="text" placeholder="Apellido" required />
              </label>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formField}>
                <span>Email</span>
                <input type="email" placeholder="ejemplo@email.com" required />
              </label>
              <label className={styles.formField}>
                <span>Teléfono</span>
                <input type="tel" placeholder="(011) 4444-5555" />
              </label>
            </div>
            <Button type="submit" variant="dark" size="md">Inscribirme</Button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Inscripcion;
