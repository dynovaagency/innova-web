import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDelta } from '../../lib/format.js';
import styles from './KpiCard.module.css';

/**
 * Card de KPI del dashboard.
 *
 * Props:
 *   - label: string. Nombre del KPI (ej. "Facturación del mes").
 *   - value: string. Valor formateado (ej. "ARS 28,000.00").
 *   - delta: number | null. Ratio de cambio (0.15 = +15%). Null oculta el delta.
 *   - deltaLabel: string opcional. Ej. "vs mes anterior".
 */
function KpiCard({ label, value, delta, deltaLabel = 'vs mes anterior' }) {
  const deltaText = delta !== null ? formatDelta(delta) : null;
  const deltaDirection =
    delta === null || delta === 0
      ? 'flat'
      : delta > 0
      ? 'up'
      : 'down';

  const DeltaIcon =
    deltaDirection === 'up'
      ? TrendingUp
      : deltaDirection === 'down'
      ? TrendingDown
      : Minus;

  return (
    <article className={styles.card}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {deltaText && (
        <div className={`${styles.delta} ${styles[`delta_${deltaDirection}`]}`}>
          <DeltaIcon size={14} aria-hidden="true" />
          <span className={styles.deltaText}>{deltaText}</span>
          <span className={styles.deltaLabel}>{deltaLabel}</span>
        </div>
      )}
    </article>
  );
}

export default KpiCard;