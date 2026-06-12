import Button from '../components/ui/Button.jsx';
import styles from './QuienesSomos.module.css';

const experiencia = [
  'Nuestra trayectoria combina lo mejor del ámbito público y privado, con una mirada integral y compromiso social.',
  'Amplia experiencia en economía popular, salud, salud mental y sistema de justicia, acompañando procesos y desarrollando proyectos.',
  'Formación y práctica docente comprobable para transmitir conocimiento y capacitar equipos con base sólida y profesional.',
];

const valores = [
  'Compromiso ético y derechos humanos',
  'Pensamiento crítico',
  'Articulación entre teoría y práctica',
  'Construcción colectiva',
  'Interdisciplinariedad',
  'Formación permanente',
  'Innovación',
  'Accesibilidad y democratización del conocimiento',
  'Rigurosidad profesional',
];

function Placeholder({ accent = 'sage' }) {
  return (
    <svg viewBox="0 0 400 280" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="280" fill="var(--color-border)" />
      <circle cx="140" cy="110" r="26" fill={accent === 'sage' ? '#82C6C5' : '#153F71'} opacity="0.45" />
      <circle cx="200" cy="150" r="32" fill="#153F71" opacity="0.4" />
      <circle cx="260" cy="120" r="24" fill="#F04847" opacity="0.4" />
      <rect x="100" y="180" width="200" height="70" rx="6" fill="#153F71" opacity="0.25" />
    </svg>
  );
}

function MisionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function VisionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.18" />
      <path d="M6 10.5 L9 13.5 L14.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QuienesSomos() {
  return (
    <div className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={styles.heroContainer}>
          <div className={styles.heroLeft}>
            <span className={styles.heroTag}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="8" r="6" />
              </svg>
              CONÓCENOS
            </span>
            <h1 className={styles.heroTitle}>
              Impulsando la transformación en
              <br />
              <span className={styles.heroTitleAccent}>el Trabajo Social</span>
            </h1>
            <p className={styles.heroDescription}>
              Somos un espacio multiplataforma de Trabajo Social dedicado a la formación, la
              supervisión profesional, la orientación y la promoción social.
            </p>
            <p className={styles.heroDescription}>
              Nuestro equipo está conformado por profesionales con amplia trayectoria, comprometidos
              con una práctica crítica, situada y transformadora. Trabajamos para fortalecer el rol
              del Trabajo Social en distintos territorios, promoviendo saberes compartidos, el
              análisis reflexivo y el compromiso ético-político con las realidades sociales.
            </p>
            <div className={styles.heroActions}>
              <Button variant="secondary" size="md">
                Descubre INNOVA
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Button>
              <div className={styles.experienceBadge}>
                <span className={styles.experienceNumber}>+20</span>
                <span className={styles.experienceLabel}>AÑOS DE<br/>EXPERIENCIA</span>
              </div>
            </div>
          </div>
          <aside className={styles.experienciaCard}>
            <h2 className={styles.experienciaTitle}>Nuestra Experiencia</h2>
            <ul className={styles.experienciaList}>
              {experiencia.map((item, idx) => (
                <li key={idx} className={styles.experienciaItem}>
                  <span className={styles.experienciaBullet} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {/* MISIÓN */}
      <section className={styles.section}>
        <div className={styles.twoCol}>
          <div className={styles.imageWrap}>
            <div className={styles.imageBack} aria-hidden="true" />
            <div className={styles.imageMain}>
              <Placeholder accent="sage" />
            </div>
          </div>
          <div className={styles.textCol}>
            <span className={`${styles.iconBadge} ${styles.iconBadgeSage}`} aria-hidden="true">
              <MisionIcon />
            </span>
            <h2 className={styles.sectionTitle}>Nuestra Misión</h2>
            <p>
              Fortalecer las prácticas profesionales del Trabajo Social mediante propuestas de
              formación, intercambio y producción de conocimiento que articulen rigurosidad teórica,
              herramientas de intervención y compromiso ético.
            </p>
            <blockquote className={styles.quote}>
              <strong>INNOVA</strong> busca construir espacios accesibles, críticos y colectivos que
              acompañen a profesionales, equipos e instituciones frente a los desafíos,
              incertidumbres y malestares de la intervención social.
            </blockquote>
          </div>
        </div>
      </section>

      {/* VISIÓN */}
      <section className={styles.section}>
        <div className={`${styles.twoCol} ${styles.twoColReverse}`}>
          <div className={styles.imageWrap}>
            <div className={styles.imageBack} aria-hidden="true" />
            <div className={styles.imageMain}>
              <Placeholder accent="blue" />
            </div>
          </div>
          <div className={styles.textCol}>
            <span className={`${styles.iconBadge} ${styles.iconBadgeSage}`} aria-hidden="true">
              <VisionIcon />
            </span>
            <h2 className={styles.sectionTitle}>Nuestra Visión</h2>
            <p>
              Consolidarnos como un multiespacio de referencia en Argentina y América Latina en
              formación, supervisión e innovación profesional en Trabajo Social y otras disciplinas
              sociales y humanas.
            </p>
            <p>
              Para ello, promovemos prácticas situadas, fundadas, interdisciplinarias y
              comprometidas con la ampliación de derechos y la transformación social.
            </p>
            <p>
              Aspiramos a contribuir al fortalecimiento de comunidades profesionales capaces de
              producir conocimiento, incidir institucionalmente y construir respuestas creativas
              frente a escenarios sociales complejos.
            </p>
          </div>
        </div>
      </section>

      {/* VALORES */}
      <section className={styles.valoresSection}>
        <header className={styles.valoresHeader}>
          <h2 className={styles.valoresTitle}>Nuestros Valores</h2>
          <p className={styles.valoresDescription}>
            Los principios fundamentales que guían nuestro trabajo diario y nuestro compromiso con
            la transformación social.
          </p>
        </header>
        <div className={styles.valoresCard}>
          <ul className={styles.valoresGrid}>
            {valores.map((valor) => (
              <li key={valor} className={styles.valoresItem}>
                <span className={styles.valoresCheck} aria-hidden="true">
                  <CheckIcon />
                </span>
                {valor}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export default QuienesSomos;
