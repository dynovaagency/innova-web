import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, GraduationCap, Monitor, Users } from 'lucide-react';
import { getSupervisorBySlug, getSupervisores } from '../data/supervisores.js';
import SupervisoresCarousel, { SupervisorFoto } from '../components/supervisores/SupervisoresCarousel.jsx';
import styles from './SupervisorPerfil.module.css';

const SECRETARIA_EMAIL = 'secretariainnova@trabajosocial.ar';

const mailtoAgenda = (nombre) => {
  const subject = `Consulta - Supervisión con ${nombre}`;
  const body = `Hola, quisiera agendar una sesión de supervisión con ${nombre}.`;
  return `mailto:${SECRETARIA_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/**
 * Perfil de un profesional de supervisión: /servicios/supervisiones/:slug
 *
 * Toma los datos de src/data/supervisores.js. Abajo muestra el carrusel
 * con el resto del equipo.
 */
function SupervisorPerfil() {
  const { slug } = useParams();
  const supervisor = getSupervisorBySlug(slug);
  const otros = getSupervisores().filter((s) => s.slug !== slug);

  useEffect(() => {
    const previo = document.title;
    if (supervisor) document.title = `${supervisor.nombre} | Supervisión Profesional | Innova`;
    return () => {
      document.title = previo;
    };
  }, [supervisor]);

  // Al pasar de un perfil a otro desde el carrusel, volver arriba.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  if (!supervisor) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h1>No encontramos este perfil</h1>
          <p>Puede que el link esté mal escrito o que el profesional ya no forme parte del equipo.</p>
          <Link to="/servicios" className={styles.backBtn}>
            <ArrowLeft size={16} aria-hidden="true" />
            Ver Supervisión Profesional
          </Link>
        </div>
      </div>
    );
  }

  const { nombre, titulo, especialidad, matricula, areas = [], bio = [], formacion = [], modalidad = {} } =
    supervisor;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerOverlay} aria-hidden="true" />
        <div className={styles.headerContent}>
          <nav className={styles.breadcrumb} aria-label="Migas de pan">
            <Link to="/">INICIO</Link>
            <span aria-hidden="true">›</span>
            <Link to="/servicios">SUPERVISIÓN PROFESIONAL</Link>
            <span aria-hidden="true">›</span>
            <span>{nombre.toUpperCase()}</span>
          </nav>
          <h1 className={styles.headerTitle}>{nombre}</h1>
          <p className={styles.headerSubtitle}>
            {[titulo, especialidad].filter(Boolean).join(' · ')}
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.photoWrap}>
            <SupervisorFoto supervisor={supervisor} eager />
          </div>
          <div className={styles.sidebarBody}>
            <a href={mailtoAgenda(nombre)} className={styles.ctaBtn}>
              Agendar una sesión
            </a>
            <ul className={styles.detailsList}>
              {modalidad.formato && (
                <li className={styles.detailItem}>
                  <span className={styles.detailIcon}>
                    <Users size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <span className={styles.detailLabel}>Modalidad</span>
                    <span className={styles.detailValue}>{modalidad.formato}</span>
                  </div>
                </li>
              )}
              {modalidad.encuentro && (
                <li className={styles.detailItem}>
                  <span className={styles.detailIcon}>
                    <Monitor size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <span className={styles.detailLabel}>Tipo de encuentro</span>
                    <span className={styles.detailValue}>{modalidad.encuentro}</span>
                  </div>
                </li>
              )}
              {matricula && (
                <li className={styles.detailItem}>
                  <span className={styles.detailIcon}>
                    <BadgeCheck size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <span className={styles.detailLabel}>Matrícula</span>
                    <span className={styles.detailValue}>{matricula}</span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </aside>

        <article className={styles.main}>
          <h2 className={styles.sectionTitle}>Sobre {nombre.split(' ')[0]}</h2>
          {bio.map((parrafo, i) => (
            <p key={i}>{parrafo}</p>
          ))}

          {areas.length > 0 && (
            <>
              <h3 className={styles.subTitle}>Áreas de trabajo</h3>
              <ul className={styles.tags}>
                {areas.map((area) => (
                  <li key={area} className={styles.tag}>
                    {area}
                  </li>
                ))}
              </ul>
            </>
          )}

          {formacion.length > 0 && (
            <>
              <h3 className={styles.subTitle}>Formación</h3>
              <ul className={styles.formacion}>
                {formacion.map((item) => (
                  <li key={item}>
                    <GraduationCap size={18} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <Link to="/servicios" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            Volver a Supervisión Profesional
          </Link>
        </article>
      </div>

      {otros.length > 0 && (
        <div className={styles.others}>
          <SupervisoresCarousel supervisores={otros} title="Otros profesionales del equipo" />
        </div>
      )}
    </div>
  );
}

export default SupervisorPerfil;