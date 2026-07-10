import { useState } from 'react';
import { Link } from 'react-router-dom';
import PaymentModal from '../components/ui/PaymentModal.jsx';
import styles from './CapsulaDetalle.module.css';

const detalles = [
  {
    label: 'Modalidad',
    value: ['100% virtual', 'A tu ritmo', 'Recorrido guiado e interactivo'],
    icon: 'play',
  },
  {
    label: 'Duración',
    value: ['25 horas acreditadas'],
    icon: 'clock',
  },
  {
    label: 'Certificación',
    value: ['Certificación oficial incluida al finalizar.'],
    icon: 'medal',
  },
  {
    label: 'Medios de pago',
    value: ['Transferencia bancaria / MercadoPago / Tarjetas de crédito y débito.'],
    icon: 'card',
  },
];

const ICONS = {
  people: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  pulse: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  medal: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="15" r="6" />
      <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
      <polyline points="12 1 15 4 12 7 9 4 12 1" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
};

function CapsulaDetalle() {
  const [paymentOpen, setPaymentOpen] = useState(false);

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerOverlay} aria-hidden="true" />
        <div className={styles.headerContent}>
          <nav className={styles.breadcrumb} aria-label="Migas de pan">
            <Link to="/">INICIO</Link>
            <span aria-hidden="true">›</span>
            <span>CÁPSULA FORMATIVA</span>
          </nav>
          <span className={styles.headerTag}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="8" r="6" />
            </svg>
            DESTACADO DEL MES
          </span>
          <h1 className={styles.headerTitle}>
            Vulnerabilidad Social y Acumulación de Desventajas en las Trayectorias de Vida
          </h1>
        </div>
      </header>

      {/* CONTENIDO */}
      <div className={styles.layout}>
        <article className={styles.main}>
          <h2 className={styles.mainTitle}>Acerca de este curso</h2>
          <p>
            Este curso se propone desarrollar una comprensión integral y crítica de la vulnerabilidad
            social como fenómeno complejo que trasciende la noción tradicional de pobreza. Su propósito
            fundamental es formar profesionales capaces de reconocer la vulnerabilidad en su carácter
            de proceso dinámico y multidimensional, comprendiendo cómo múltiples factores se entrelazan
            para generar situaciones de exclusión social.
          </p>
          <blockquote className={styles.quote}>
            A través del análisis de trayectorias de vida, el curso busca que los estudiantes
            identifiquen cómo la acumulación de desventajas se estructura de manera encadenada,
            creando mecanismos que perpetúan la vulnerabilización.
          </blockquote>
          <p>
            Para ello, se examinarán críticamente los factores estructurales, institucionales,
            relacionales e individuales que intervienen en estos procesos, reconociendo que la
            vulnerabilidad no es un estado fijo sino el resultado de interacciones complejas entre
            sistemas, instituciones, vínculos sociales y características personales.
          </p>
        </article>

        <aside className={styles.sidebar}>
          <div className={styles.priceBlock}>
            <div className={styles.priceLine}>
              <span className={styles.priceCurrency}>$</span>
              <span className={styles.priceAmount}>28.000</span>
              <span className={styles.priceUnit}>ARS</span>
            </div>
            <p className={styles.priceNote}>Valor promocional (A consultar)</p>
          </div>

          <button
            type="button"
            className={styles.ctaBtn}
            onClick={() => setPaymentOpen(true)}
          >
            ¡INSCRIBITE AHORA!
          </button>

          <div className={styles.detailsSection}>
            <h3 className={styles.detailsTitle}>Detalles del Curso</h3>
            <ul className={styles.detailsList}>
              {detalles.map((d) => (
                <li key={d.label} className={styles.detailItem}>
                  <span className={styles.detailIcon}>{ICONS[d.icon]}</span>
                  <div>
                    <span className={styles.detailLabel}>{d.label}</span>
                    <ul className={styles.detailValues}>
                      {d.value.map((v) => (
                        <li key={v}>{v.startsWith('•') ? v : (d.value.length > 1 ? `• ${v}` : v)}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        product={{
          slug: 'vulnerabilidad-social',
          title: 'Cápsula: Vulnerabilidad Social',
          price: '$ 28.000',
        }}
      />
    </div>
  );
}

export default CapsulaDetalle;
