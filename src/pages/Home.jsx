import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import PaymentModal from '../components/ui/PaymentModal.jsx';
import heroConferencia from '../assets/hero-conferencia.jpg';
import cardCapsula from '../assets/card-capsula.jpg';
import cardSupervision from '../assets/card-supervision.jpg';
import cardBiblioteca from '../assets/card-biblioteca.jpg';
import styles from './Home.module.css';

const heroSlides = [
  { image: heroConferencia, alt: 'Encuentro de formación profesional en Innova' },
  { image: cardSupervision, alt: 'Sesión de supervisión profesional' },
  { image: cardCapsula, alt: 'Cápsula formativa: aprendizaje en línea' },
  { image: cardBiblioteca, alt: 'Recursos académicos en Biblioteca Abierta' },
];

const HERO_AUTOPLAY_MS = 5000;

const services = [
  {
    slug: 'capsula-formativa',
    tag: 'DESTACADO DEL MES',
    title: 'Cápsula Formativa',
    description:
      'Accedé a nuestra cápsula de formación especializada de este mes. Contenido actualizado, práctico y diseñado para fortalecer tus competencias en el Trabajo Social contemporáneo.',
    cta: 'Ver Cápsula',
    href: '/servicios/capsula-formativa',
    accent: 'red',
    icon: 'video',
    badge: 'DESTACADO',
    image: cardCapsula,
  },
  {
    slug: 'supervisiones',
    tag: 'ACOMPAÑAMIENTO PROFESIONAL',
    title: 'Supervisiones',
    description:
      'Espacios de análisis reflexivo y orientación para profesionales y equipos. Abordamos los desafíos e incertidumbres de la intervención social desde una perspectiva crítica y situada.',
    cta: 'Agendar Sesión',
    href: '/servicios',
    accent: 'sage',
    icon: 'people',
    image: cardSupervision,
  },
  {
    slug: 'biblioteca',
    tag: 'RECURSOS Y SABERES',
    title: 'Biblioteca',
    description:
      'Explorá nuestra colección de recursos, artículos, normativas y material de consulta indispensable para el ejercicio y la investigación en las disciplinas sociales.',
    cta: 'Explorar Biblioteca',
    href: '/biblioteca',
    accent: 'blue',
    icon: 'book',
    image: cardBiblioteca,
  },
];

const checks = [
  'Espacio multiplataforma para profesionales del Trabajo Social.',
  'Equipo con amplia trayectoria en intervención e investigación.',
  'Acompañamiento crítico y situado con perspectiva ética.',
];

const SERVICE_ICONS = {
  video: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M22 8l-6 4 6 4V8z" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
};

function ServiceCard({ tag, title, description, cta, href, icon, badge, image }) {
  return (
    <article className={styles.serviceCard}>
      <div className={styles.serviceImage}>
        <img src={image} alt={title} loading="lazy" />
        <span className={styles.serviceIcon}>{SERVICE_ICONS[icon]}</span>
        {badge && <span className={styles.serviceBadge}>{badge}</span>}
      </div>
      <div className={styles.serviceBody}>
        <span className={styles.serviceTag}>{tag}</span>
        <h3 className={styles.serviceTitle}>{title}</h3>
        <p className={styles.serviceDescription}>{description}</p>
        <Link to={href} className={styles.serviceCta}>
          <span>{cta}</span>
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
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-advance del slider del hero. Se reinicia cuando el usuario interactúa
  // con los dots, para que el slide elegido manualmente tenga el tiempo
  // completo de visualización antes de pasar al siguiente.
  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, HERO_AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [activeSlide]);

  const openPayment = (product) => {
    setSelectedProduct(product);
    setPaymentOpen(true);
  };

  return (
    <div className={styles.home}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          {/* Bocadillo blanco con forma irregular y cola asomando abajo-izquierda.
              Polígono: top-left → top edge horizontal → diagonal arriba-derecha →
              vértice derecho (pico) → diagonal abajo-derecha → bottom edge → cola
              (down-left) → bottom-left corner → close */}
          <svg
            className={styles.heroBubbleSvg}
            viewBox="0 0 600 600"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 0,60 L 450,60 L 580,290 L 450,500 L 160,500 L 60,590 L 80,500 L 0,500 Z"
              fill="#FFFFFF"
            />
          </svg>

          <div className={styles.heroContent}>
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
            <Button variant="secondary" size="md">
              Descubre INNOVA
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Button>
          </div>
        </div>

        <div className={styles.heroRight}>
          {heroSlides.map((slide, idx) => (
            <img
              key={idx}
              src={slide.image}
              alt={slide.alt}
              className={`${styles.heroImg} ${activeSlide === idx ? styles.heroImgActive : ''}`}
              loading={idx === 0 ? 'eager' : 'lazy'}
              aria-hidden={activeSlide !== idx}
            />
          ))}
          <div className={styles.heroDots} role="tablist" aria-label="Slides del hero">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={activeSlide === idx}
                aria-label={`Ir al slide ${idx + 1} de ${heroSlides.length}`}
                className={`${styles.dot} ${activeSlide === idx ? styles.dotActive : ''}`}
                onClick={() => setActiveSlide(idx)}
              />
            ))}
          </div>
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
