import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Servicios.module.css';

const ICONS = {
  shield: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  bulb: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6" /><path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  ),
  compass: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  monitor: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

const tabs = {
  supervision: {
    label: 'Supervisión Profesional',
    title: 'Sesiones de Supervisión Profesional',
    breadcrumb: 'ACOMPAÑAMIENTO PROFESIONAL',
    paragraphs: [
      'Las sesiones de supervisión constituyen espacios de reflexión crítica y acompañamiento compartido sobre nuestras prácticas cotidianas. Este proceso ofrece un lugar de cuidado y contención donde podemos abordar colectivamente las complejidades del trabajo social, desde una mirada integral, ética y transformadora que nos convoca y nos compromete.',
      'Reconocemos que la supervisión no es un acto de evaluación externa, sino un proceso de construcción conjunta en el que cada voz aporta y enriquece nuestra comprensión compartida.',
    ],
    quote:
      'En estas sesiones, te acompañamos en la revisión de tus intervenciones, fortaleciendo el análisis crítico y constructivo, la toma fundamentada de decisiones y la consolidación de tu identidad profesional.',
    subCards: [
      {
        title: 'Cuidado y Contención',
        icon: 'shield',
        description:
          'Un espacio seguro para abordar las complejidades de nuestra labor diaria sin juicios, promoviendo el bienestar del profesional y la mejora continua de sus prácticas.',
      },
      {
        title: 'Construcción Conjunta',
        icon: 'message',
        description:
          'Entendemos la supervisión como un diálogo donde el conocimiento se construye horizontalmente, valorando cada perspectiva para enriquecer la mirada disciplinar.',
      },
    ],
    sidebar: {
      heading: '¿QUERÉS SER PARTE?',
      description: 'Contactanos para explorar cómo la supervisión puede fortalecer tu trayectoria profesional.',
      cta: 'AGENDA TU PRÓXIMA SESIÓN',
      detalles: [
        { label: 'Modalidad', value: 'Individual o Grupal', icon: 'people' },
        { label: 'Tipo de Encuentro', value: 'Virtual o Presencial', icon: 'monitor' },
        { label: 'Duración', value: 'Entre 6 a 8 sesiones de 1 hora.', icon: 'clock' },
      ],
    },
  },
  orientacion: {
    label: 'Orientación y Asesoramiento',
    title: 'Sesiones de Orientación y Asesoramiento',
    breadcrumb: 'ACOMPAÑAMIENTO PROFESIONAL',
    paragraphs: [
      'Las sesiones de orientación y asesoramiento constituyen espacios de reflexión y construcción de respuestas ante interrogantes que surgen en nuestras prácticas profesionales. Reconocemos que los desafíos concretos del trabajo social exigen no solo información, sino un análisis crítico y contextualizado que nos permita comprender las complejidades subyacentes.',
      'Buscamos fortalecer tu capacidad de análisis y toma de decisiones, reconociendo que las soluciones más transformadoras emergen cuando cuestionamos críticamente los desafíos y exploramos alternativas posibles.',
    ],
    quote:
      'A partir de tus inquietudes, te acompañamos en un proceso de exploración compartida donde ofrecemos información fundamentada, claridad conceptual y apoyo reflexivo.',
    subCards: [
      {
        title: 'Claridad Conceptual',
        icon: 'bulb',
        description:
          'Brindamos herramientas teóricas y prácticas para desentrañar las situaciones complejas, facilitando una comprensión más profunda y fundamentada del contexto.',
      },
      {
        title: 'Toma de Decisiones',
        icon: 'compass',
        description:
          'Acompañamos el proceso de elegir los caminos de intervención más adecuados, empoderando al profesional para actuar con seguridad y ética.',
      },
    ],
    sidebar: {
      heading: '¿TENÉS UN INTERROGANTE?',
      description: 'Conversemos sobre ello. Solicita tu sesión de orientación y exploremos juntos las mejores alternativas.',
      cta: 'AGENDA TU PRÓXIMA SESIÓN',
      detalles: [
        { label: 'Modalidad', value: 'Individual o Grupal', icon: 'people' },
        { label: 'Tipo de Encuentro', value: 'Virtual o Presencial', icon: 'monitor' },
        { label: 'Duración', value: 'Entre 2 o 3 sesiones de 1 hora y media.', icon: 'clock' },
      ],
    },
  },
};

function Servicios() {
  const [active, setActive] = useState('supervision');
  const data = tabs[active];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerOverlay} aria-hidden="true" />
        <div className={styles.headerContent}>
          <nav className={styles.breadcrumb} aria-label="Migas de pan">
            <Link to="/">INICIO</Link>
            <span aria-hidden="true">›</span>
            <span>{data.breadcrumb}</span>
          </nav>
          <span className={styles.headerTag}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="8" r="6" />
            </svg>
            SERVICIOS PROFESIONALES
          </span>
          <h1 className={styles.headerTitle}>{data.title}</h1>

          <div className={styles.tabs} role="tablist">
            {Object.entries(tabs).map(([key, t]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active === key}
                className={`${styles.tab} ${active === key ? styles.tabActive : ''}`}
                onClick={() => setActive(key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <article className={styles.main}>
          <h2 className={styles.mainTitle}>Acerca de este espacio</h2>
          <p>{data.paragraphs[0]}</p>
          <blockquote className={styles.quote}>{data.quote}</blockquote>
          {data.paragraphs.slice(1).map((p, i) => <p key={i}>{p}</p>)}

          <div className={styles.subCards}>
            {data.subCards.map((s) => (
              <div key={s.title} className={styles.subCard}>
                <span className={styles.subCardIcon}>{ICONS[s.icon]}</span>
                <h3 className={styles.subCardTitle}>{s.title}</h3>
                <p className={styles.subCardText}>{s.description}</p>
              </div>
            ))}
          </div>
        </article>

        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarHeading}>{data.sidebar.heading}</h3>
          <p className={styles.sidebarDescription}>{data.sidebar.description}</p>
          <button type="button" className={styles.ctaBtn}>{data.sidebar.cta}</button>

          <div className={styles.detailsSection}>
            <h4 className={styles.detailsTitle}>Detalles del Encuentro</h4>
            <ul className={styles.detailsList}>
              {data.sidebar.detalles.map((d) => (
                <li key={d.label} className={styles.detailItem}>
                  <span className={styles.detailIcon}>{ICONS[d.icon]}</span>
                  <div>
                    <span className={styles.detailLabel}>{d.label}</span>
                    <span className={styles.detailValue}>{d.value}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Servicios;
