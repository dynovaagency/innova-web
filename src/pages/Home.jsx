import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import PaymentModal from '../components/ui/PaymentModal.jsx';
import styles from './Home.module.css';

const services = [
  {
    tag: 'DESTACADO DEL MES',
    title: 'Cápsula Formativa',
    description:
      'Accedé a nuestra cápsula de formación especializada de este mes. Contenido actualizado, práctico y diseñado para fortalecer tus competencias en el Trabajo Social contemporáneo.',
    cta: 'Ver Cápsula',
    href: '/servicios',
    accent: 'sage',
  },
  {
    tag: 'ACOMPAÑAMIENTO PROFESIONAL',
    title: 'Supervisiones',
    description:
      'Espacios de análisis reflexivo y orientación para profesionales y equipos. Abordamos los desafíos e incertidumbres de la intervención social desde una perspectiva crítica y situada.',
    cta: 'Agendar Sesión',
    href: '/servicios',
    accent: 'red',
  },
  {
    tag: 'RECURSOS Y SABERES',
    title: 'Biblioteca',
    description:
      'Explorá nuestra colección de recursos, artículos, normativas y material de consulta indispensable para el ejercicio y la investigación en las disciplinas sociales.',
    cta: 'Explorar Biblioteca',
    href: '/biblioteca',
    accent: 'blue',
  },
];

const checks = [
  'Espacio multiplataforma para profesionales del Trabajo Social.',
  'Equipo con amplia trayectoria en intervención e investigación.',
  'Acompañamiento crítico y situado con perspectiva ética.',
];

function ServiceCard({ tag, title, description, cta, href, accent }) {
  return (
    <article className={styles.serviceCard}>
      <div className={`${styles.serviceImage} ${styles[`accent_${accent}`]}`} aria-hidden="true">
        <svg viewBox="0 0 200 140" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="200" height="140" fill="currentColor" opacity="0.15" />
          <circle cx="70" cy="55" r="14" fill="currentColor" opacity="0.35" />
          <path d="M30 115 L80 70 L120 95 L160 80 L160 115 Z" fill="currentColor" opacity="0.35" />
        </svg>
      </div>
      <div className={styles.serviceBody}>
        <span className={styles.serviceTag}>{tag}</span>
        <h3 className={styles.serviceTitle}>{title}</h3>
        <p className={styles.serviceDescription}>{description}</p>
        <Link to={href} className={styles.serviceCta}>
          {cta}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

function Home() {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const openPayment = (product) => {
    setSelectedProduct(product);
    setPaymentOpen(true);
  };

  return (
    <div className={styles.home}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroDecorTop} aria-hidden="true">
          <svg viewBox="0 0 400 280" preserveAspectRatio="none">
            <path d="M0,0 L0,200 L120,180 L160,240 L200,160 L280,200 L320,120 L400,140 L400,0 Z" fill="#F04847" />
          </svg>
        </div>
        <div className={styles.heroContainer}>
          <div className={styles.heroLeft}>
            <span className={styles.heroTag}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="8" r="6" />
              </svg>
              CONÓCENOS
            </span>
            <h1 className={styles.heroTitle}>
              Bienvenidos a <span className={styles.heroTitleHighlight}>INNOVA</span>
            </h1>
            <p className={styles.heroDescription}>
              Creemos en un Trabajo Social que promueve el pensamiento crítico, la transformación social
              y el fortalecimiento de la identidad profesional y cultural. Acompañamos a colegas en sus
              recorridos, reconociendo sus contextos, desafíos y potencialidades.
            </p>
            <Button variant="primary" size="md">
              Descubre INNOVA
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Button>
          </div>
          <div className={styles.heroRight}>
            <div className={styles.heroImage} aria-hidden="true">
              <svg viewBox="0 0 400 320" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
                <rect width="400" height="320" fill="#E8E4DC" />
                <circle cx="140" cy="120" r="28" fill="#82C6C5" opacity="0.5" />
                <circle cx="200" cy="160" r="32" fill="#153F71" opacity="0.4" />
                <circle cx="260" cy="130" r="26" fill="#F04847" opacity="0.4" />
                <rect x="100" y="190" width="200" height="80" rx="6" fill="#153F71" opacity="0.2" />
              </svg>
            </div>
          </div>
        </div>
        <div className={styles.heroDecorBottom} aria-hidden="true">
          <svg viewBox="0 0 400 200" preserveAspectRatio="none">
            <path d="M0,200 L0,80 L120,100 L160,40 L200,120 L280,80 L320,160 L400,140 L400,200 Z" fill="#F04847" />
          </svg>
        </div>
        <div className={styles.heroDots} role="tablist" aria-label="Slides del hero">
          <span className={`${styles.dot} ${styles.dotActive}`} role="tab" aria-selected="true" />
          <span className={styles.dot} role="tab" aria-selected="false" />
          <span className={styles.dot} role="tab" aria-selected="false" />
          <span className={styles.dot} role="tab" aria-selected="false" />
        </div>
      </section>

      {/* SERVICIOS */}
      <section className={styles.services}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Nuestros Servicios</h2>
          <p className={styles.sectionDescription}>
            Descubrí nuestras propuestas de formación, acompañamiento y recursos, diseñadas
            especialmente para potenciar tu desarrollo profesional.
          </p>
        </header>
        <div className={styles.servicesGrid}>
          {services.map((service) => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
        <div className={styles.servicesTryout}>
          <p>¿Querés probar el flujo de inscripción a una cápsula?</p>
          <Button
            variant="primary"
            size="md"
            onClick={() => openPayment({ title: 'Cápsula Formativa', price: 'A definir' })}
          >
            Inscribirme a la Cápsula
          </Button>
        </div>
      </section>

      {/* BANNER AZUL */}
      <section className={styles.banner}>
        <div className={styles.bannerOverlay} aria-hidden="true" />
        <div className={styles.bannerContent}>
          <h2 className={styles.bannerTitle}>
            Innovación y Formación en
            <br />
            <span className={styles.bannerTitleAccent}>Trabajo Social</span>
          </h2>
          <p className={styles.bannerDescription}>
            Un espacio multiplataforma diseñado para profesionales comprometidos con la transformación social.
          </p>
          <Button variant="primary" size="md">
            Descubre INNOVA
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </div>
      </section>

      {/* FORMULARIO */}
      <section className={styles.formSection}>
        <div className={styles.formCard}>
          <div className={styles.formLeft}>
            <h2 className={styles.formTitle}>
              Un equipo dedicado a hacer crecer tu organización
            </h2>
            <p className={styles.formDescription}>
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
          <form className={styles.formRight} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.formRow}>
              <label className={styles.formField}>
                <span>Nombre</span>
                <input type="text" placeholder="Nombre" />
              </label>
              <label className={styles.formField}>
                <span>Apellido</span>
                <input type="text" placeholder="Apellido" />
              </label>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formField}>
                <span>Email</span>
                <input type="email" placeholder="ejemplo@email.com" />
              </label>
              <label className={styles.formField}>
                <span>Teléfono</span>
                <input type="tel" placeholder="(011) 4444-5555" />
              </label>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formField}>
                <span>Empresa / Institución</span>
                <input type="text" placeholder="Institución" />
              </label>
              <label className={styles.formField}>
                <span>Rol</span>
                <input type="text" placeholder="Rol" />
              </label>
            </div>
            <Button type="submit" variant="dark" size="md">Inscribirme</Button>
          </form>
        </div>
      </section>

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
}

export default Home;
