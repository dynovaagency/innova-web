import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import CategoryIcon from './CategoryIcon.jsx';
import styles from './CapsulaCard.module.css';

/**
 * Card de una cápsula en el grid del listado público.
 *
 * Props:
 *   - product: { slug, title, description, price, currency, category,
 *                duration, imageUrl }
 */

const formatPrice = (amount, currency = 'ARS') => {
  const nf = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `$${nf.format(amount || 0)}`;
};

function CapsulaCard({ product }) {
  const detailUrl = `/servicios/${product.slug}`;

  return (
    <article className={styles.card}>
      <Link to={detailUrl} className={styles.imageWrap} aria-label={`Ver detalle de ${product.title}`}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className={styles.image} loading="lazy" />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true" />
        )}
        <span className={styles.categoryBadge}>
          <CategoryIcon category={product.category} size="sm" />
        </span>
      </Link>

      <div className={styles.body}>
        <span className={styles.categoryTag}>
          <span className={styles.modalidadTag}>
            {product.modalidad === 'curso' ? 'CURSO' : 'CÁPSULA'}
          </span>
          {product.category && <span aria-hidden="true"> · </span>}
          {product.category?.toUpperCase()}
        </span>
        <h3 className={styles.title}>
          <Link to={detailUrl} className={styles.titleLink}>
            {product.title}
          </Link>
        </h3>
        <p className={styles.description}>{product.description}</p>

        <div className={styles.footer}>
          <div className={styles.priceRow}>
            <p className={styles.price}>
              {formatPrice(product.price, product.currency)}{' '}
              <span className={styles.currency}>{product.currency || 'ARS'}</span>
            </p>
            <Link to={detailUrl} className={styles.ctaLink}>
              Ver Cápsula
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {product.duration && (
            <p className={styles.duration}>
              <Clock size={12} aria-hidden="true" />
              <span>{product.duration}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default CapsulaCard;