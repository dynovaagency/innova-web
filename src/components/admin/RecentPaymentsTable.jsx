import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/format.js';
import EmptyState from './EmptyState.jsx';
import { Receipt } from 'lucide-react';
import styles from './RecentPaymentsTable.module.css';

/**
 * Tabla de últimas compras aprobadas.
 *
 * Props:
 *   - payments: array de { externalReference, buyerEmail, productTitle, amount, currency, approvedAt }
 */
function RecentPaymentsTable({ payments }) {
  if (!payments || payments.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Todavía no hay compras aprobadas"
        message="Cuando alguien complete un pago, va a aparecer acá."
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Email</th>
              <th scope="col">Curso</th>
              <th scope="col" className={styles.numeric}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.externalReference}>
                <td className={styles.dateCol}>{formatDate(p.approvedAt)}</td>
                <td className={styles.emailCol}>
                  <span title={p.buyerEmail}>{p.buyerEmail || '—'}</span>
                </td>
                <td className={styles.courseCol}>
                  <span title={p.productTitle}>{p.productTitle}</span>
                </td>
                <td className={`${styles.amountCol} ${styles.numeric}`}>
                  {formatCurrency(p.amount, p.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link to="/admin/pagos" className={styles.viewAll}>
        Ver todos los pagos
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

export default RecentPaymentsTable;