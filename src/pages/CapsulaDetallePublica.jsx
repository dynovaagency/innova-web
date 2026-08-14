import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Clock, Award, CreditCard, ArrowLeft } from 'lucide-react';
import PaymentModal from '../components/ui/PaymentModal.jsx';
import { useProduct } from '../hooks/useProduct.js';
import CategoryIcon from '../components/capsulas/CategoryIcon.jsx';
import styles from './CapsulaDetallePublica.module.css';

/**
 * Página pública de detalle de una cápsula (antes de comprar).
 *
 * Se sirve en /servicios/:slug. Es la vista que ve el usuario después
 * de clickear "Ver Cápsula" en el listado o desde un link directo.
 *
 * Estados:
 *   - Loading: mientras carga el producto.
 *   - Error: producto no encontrado (404) o inactivo → mensaje amigable.
 *   - OK: muestra info + CTA de compra.
 *
 * Recicla el diseño de CapsulaDetalle (breadcrumb, sidebar con precio,
 * lista de detalles) pero se adapta a productos dinámicos.
 */

const formatPriceARS = (amount) => {
  const nf = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `$ ${nf.format(amount || 0)}`;
};

function CapsulaDetallePublica() {
  const { slug } = useParams();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const { product, loading, error } = useProduct(slug);

  if (loading) {
    return (
      <div className={styles.centeredState}>
        <p>Cargando cápsula...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.centeredState}>
        <h1 className={styles.errorTitle}>Cápsula no disponible</h1>
        <p className={styles.errorText}>
          Esta cápsula no existe o no está disponible en este momento.
        </p>
        <Link to="/servicios/capsulas" className={styles.backButton}>
          <ArrowLeft size={16} aria-hidden="true" />
          Ver todas las cápsulas
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerOverlay} aria-hidden="true" />
        <div className={styles.headerContent}>
          <nav className={styles.breadcrumb} aria-label="Migas de pan">
            <Link to="/">Inicio</Link>
            <span aria-hidden="true">›</span>
            <Link to="/servicios/capsulas">Cápsulas y Cursos</Link>
            <span aria-hidden="true">›</span>
            <span>{product.title}</span>
          </nav>

          {product.category && (
            <div className={styles.categoryRow}>
              <CategoryIcon category={product.category} size="sm" />
              <span className={styles.categoryLabel}>{product.category.toUpperCase()}</span>
            </div>
          )}

          <h1 className={styles.headerTitle}>{product.title}</h1>
        </div>
      </header>

      <div className={styles.layout}>
        <article className={styles.main}>
          <h2 className={styles.mainTitle}>Acerca de este curso</h2>
          <p className={styles.description}>{product.description}</p>
        </article>

        <aside className={styles.sidebar}>
          <div className={styles.priceBlock}>
            <div className={styles.priceLine}>
              <span className={styles.priceCurrency}>$</span>
              <span className={styles.priceAmount}>
                {new Intl.NumberFormat('es-AR').format(product.price)}
              </span>
              <span className={styles.priceUnit}>{product.currency || 'ARS'}</span>
            </div>
            <p className={styles.priceNote}>Valor promocional (a consultar)</p>
          </div>

          <button
            type="button"
            className={styles.ctaBtn}
            onClick={() => setPaymentOpen(true)}
          >
            ¡Inscribite ahora!
          </button>

          <div className={styles.detailsSection}>
            <h3 className={styles.detailsTitle}>Detalles del Curso</h3>
            <ul className={styles.detailsList}>
              <li className={styles.detailItem}>
                <Play size={18} className={styles.detailIcon} aria-hidden="true" />
                <div>
                  <span className={styles.detailLabel}>Modalidad</span>
                  <span className={styles.detailValue}>
                    {product.contentType === 'external_link'
                      ? 'Contenido en vivo o link externo'
                      : '100% virtual · A tu ritmo'}
                  </span>
                </div>
              </li>

              {product.duration && (
                <li className={styles.detailItem}>
                  <Clock size={18} className={styles.detailIcon} aria-hidden="true" />
                  <div>
                    <span className={styles.detailLabel}>Duración</span>
                    <span className={styles.detailValue}>{product.duration}</span>
                  </div>
                </li>
              )}

              <li className={styles.detailItem}>
                <Award size={18} className={styles.detailIcon} aria-hidden="true" />
                <div>
                  <span className={styles.detailLabel}>Certificación</span>
                  <span className={styles.detailValue}>Incluida al finalizar</span>
                </div>
              </li>

              <li className={styles.detailItem}>
                <CreditCard size={18} className={styles.detailIcon} aria-hidden="true" />
                <div>
                  <span className={styles.detailLabel}>Medios de pago</span>
                  <span className={styles.detailValue}>
                    Transferencia · MercadoPago · Tarjetas
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        product={{
          slug: product.slug,
          title: product.title,
          price: product.price,
          currency: product.currency || 'ARS',
          priceFormatted: formatPriceARS(product.price),
        }}
      />
    </div>
  );
}

export default CapsulaDetallePublica;