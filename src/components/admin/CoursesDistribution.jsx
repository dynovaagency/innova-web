import { formatCurrency, formatNumber } from '../../lib/format.js';
import EmptyState from './EmptyState.jsx';
import { BookOpen } from 'lucide-react';
import styles from './CoursesDistribution.module.css';

/**
 * Distribución de ventas del mes actual por curso.
 *
 * Props:
 *   - courses: array de { cursoSlug, productTitle, currentMonthCount, currentMonthRevenue, currency }
 */
function CoursesDistribution({ courses }) {
  if (!courses || courses.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No hay cursos activos"
        message="Cargá cursos desde la sección Cápsulas para ver su distribución."
      />
    );
  }

  const maxCount = Math.max(...courses.map((c) => c.currentMonthCount), 1);

  return (
    <ul className={styles.list}>
      {courses.map((course) => {
        const barWidth = Math.max(
          (course.currentMonthCount / maxCount) * 100,
          course.currentMonthCount > 0 ? 4 : 0
        );
        return (
          <li key={course.cursoSlug} className={styles.item}>
            <div className={styles.itemHeader}>
              <span className={styles.itemTitle} title={course.productTitle}>
                {course.productTitle}
              </span>
              <span className={styles.itemCount}>
                {formatNumber(course.currentMonthCount)}{' '}
                <span className={styles.itemCountLabel}>
                  {course.currentMonthCount === 1 ? 'venta' : 'ventas'}
                </span>
              </span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${barWidth}%` }}
                aria-hidden="true"
              />
            </div>
            <div className={styles.itemFooter}>
              <span className={styles.itemRevenue}>
                {formatCurrency(course.currentMonthRevenue, course.currency)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default CoursesDistribution;