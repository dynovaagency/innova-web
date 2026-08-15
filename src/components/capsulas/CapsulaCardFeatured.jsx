import { Link } from 'react-router-dom';
import { ArrowRight, Play, Clock, Award } from 'lucide-react';
import styles from './CapsulaCardFeatured.module.css';

/**
 * Card destacada de una cápsula (bloque superior del listado público).
 *
 * Props:
 *   - product: producto completo con todos los campos.
 */

const formatPrice = (amount) => {
  const nf = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return nf.format(amount || 0);
};

function CapsulaCardFeatured({ product }) {
  if (!product) return null;
  const detailUrl = `/servicios/${product.slug}`;

  return (
    <article className={styles.card}>
      <Link to={detailUrl} className={styles.imageWrap} aria-label={`Ver detalle de ${product.title}`}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true" />
        )}
      </Link>

      <div className={styles.body}>
        {product.category && (
          <span className={styles.category}>
          <span className={styles.modalidadTag}>
            {product.modalidad === 'curso' ? 'CURSO' : 'CÁPSULA'}
          </span>
          {product.category && <span aria-hidden="true"> · </span>}
          {product.category && product.category.toUpperCase()}
        </span>
        )}
        <h2 className={styles.title}>{product.title}</h2>
        <p className={styles.description}>{product.description}</p>

        <div className={styles.priceRow}>
          <p className={styles.price}>
            <span className={styles.priceCurrency}>$</span>
            <span className={styles.priceAmount}>{formatPrice(product.price)}</span>
            <span className={styles.priceUnit}>{product.currency || 'ARS'}</span>
          </p>
          <Link to={detailUrl} className={styles.ctaBtn}>
            ¡Inscribite ahora!
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className={styles.priceNote}>Valor promocional (a consultar)</p>

        <ul className={styles.features}>
          <li className={styles.feature}>
            <Play size={16} aria-hidden="true" />
            <span>100% virtual / a tu ritmo</span>
          </li>
          {product.duration && (
            <li className={styles.feature}>
              <Clock size={16} aria-hidden="true" />
              <span>{product.duration}</span>
            </li>
          )}
          <li className={styles.feature}>
            <Award size={16} aria-hidden="true" />
            <span>Certificado de Aprobación</span>
          </li>
        </ul>
      </div>
    </article>
  );
}

export default CapsulaCardFeatured;