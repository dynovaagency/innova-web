import { Link } from 'react-router-dom';
import formacionesHero from '../assets/formaciones-hero.jpg';
import styles from './Formaciones.module.css';

/**
 * Página Formaciones — espacios prácticos orientados al trabajo con
 * herramientas, casos, recursos o dispositivos de intervención.
 *
 * Estructura: hero a 2 columnas (texto + foto con card overlay
 * "Perspectiva Crítica") + sección "Calendario de Formaciones" con
 * 3 columnas para los próximos meses.
 *
 * El calendario es contenido editable: cuando Innova actualiza la oferta,
 * se modifica el array `calendario` con los nuevos meses y cursos.
 */

const calendario = [
  {
    mes: 'AGOSTO',
    accent: 'primary',
    cursos: [
      'Técnicas de intervención social: registros, observaciones, entrevistas e informe social.',
      'Trabajo Social Forense II: Asuntos de Familia y Capacidad de las Personas.',
      'Competencias y habilidades profesionales para la intervención en Trabajo Social.',
    ],
  },
  {
    mes: 'SEPTIEMBRE',
    accent: 'sage',
    cursos: ['Adopción, Vinculación y Construcción de Filiación.'],
  },
  {
    mes: 'OCTUBRE',
    accent: 'lime',
    cursos: [
      'La Perspectiva Etnográfica como herramienta para la Evaluación desde el Trabajo Social.',
    ],
  },
];

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function Formaciones() {
  return (
    <div className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={styles.heroContainer}>
          <div className={styles.heroText}>
            <span className={styles.heroTag}>
              <CalendarIcon />
              EDUCACIÓN CONTINUA
            </span>
            <h1 className={styles.heroTitle}>Formaciones</h1>
            <p className={styles.heroDescription}>
              En <strong>INNOVA</strong> desarrollamos diversas propuestas de formación destinadas
              a profesionales, estudiantes avanzados e instituciones interesadas en fortalecer sus
              prácticas, actualizar conocimientos y reflexionar críticamente sobre los desafíos
              contemporáneos de la intervención social.
            </p>
            <p className={styles.heroDescription}>
              Nuestra oferta incluye cursos, seminarios, workshops, masterclass, conversatorios y
              espacios de actualización profesional diseñados para articular rigurosidad conceptual,
              herramientas de intervención y reflexión ética.
            </p>
            <p className={styles.heroDescription}>
              Cada propuesta constituye una oportunidad para intercambiar experiencias, construir
              conocimiento colectivo y fortalecer competencias profesionales desde una perspectiva
              crítica, interdisciplinaria y situada.
            </p>
          </div>

          <div className={styles.heroPhoto}>
            <img
              src={formacionesHero}
              alt="Encuentro de formación profesional en Innova"
              className={styles.heroImg}
            />
            <div className={styles.perspectivaCard}>
              <h3 className={styles.perspectivaTitle}>Perspectiva Crítica</h3>
              <p className={styles.perspectivaText}>
                Articulando rigurosidad conceptual y herramientas de intervención.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CALENDARIO */}
      <section className={styles.calendar}>
        <header className={styles.calendarHeader}>
          <span className={styles.calendarTag}>
            <CalendarIcon />
            AGENDA
          </span>
          <h2 className={styles.calendarTitle}>Calendario de Formaciones</h2>
          <p className={styles.calendarSubtitle}>
            Planifica tu desarrollo profesional con nuestros próximos espacios de formación
            especializada.
          </p>
        </header>

        <div className={styles.calendarGrid}>
          {calendario.map((mes) => (
            <div key={mes.mes} className={styles.monthColumn}>
              <div className={`${styles.monthHeader} ${styles[`accent_${mes.accent}`]}`}>
                <span className={styles.monthLabel}>{mes.mes}</span>
              </div>
              <ul className={styles.cursosList}>
                {mes.cursos.map((curso, idx) => (
                  <li key={idx} className={styles.cursoCard}>
                    <span className={`${styles.cursoIcon} ${styles[`accent_${mes.accent}`]}`}>
                      <BookIcon />
                    </span>
                    <p className={styles.cursoText}>{curso}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Formaciones;
