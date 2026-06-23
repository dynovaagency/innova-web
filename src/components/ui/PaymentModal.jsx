import { useEffect, useState, useRef } from 'react';
import Button from './Button.jsx';
import styles from './PaymentModal.module.css';

/**
 * Modal "Elegí tu medio de pago".
 * Dos opciones acordeón:
 *   1. Mercado Pago — link directo al cobro
 *   2. Cuenta DNI — QR clickeable
 *
 * Datos sensibles a actualizar cuando cambien:
 *   - MERCADOPAGO_LINK: URL de cobro Mercado Pago
 *   - CUENTA_DNI_LINK: destino del QR (TODO: pedir a Innova)
 *   - CAPSULA_PRICE: precio de la cápsula
 *
 * Props:
 *   - open: boolean  → controla si está visible
 *   - onClose: () => void  → callback al cerrar
 *   - product: { title, price }  → cápsula que se está comprando
 */

const MERCADOPAGO_LINK = 'https://mpago.li/17xr3Mr';
const CUENTA_DNI_LINK = 'https://link.cuentadni.com.ar/INNOVA'; // TODO: confirmar URL real con Innova
const CAPSULA_PRICE = '$ 28.000';

const ICONS = {
  mp: (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#82C6C5" />
      <text x="16" y="20" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="11" fill="#153F71">MP</text>
    </svg>
  ),
  qr: (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#153F71" />
      <rect x="7" y="7" width="7" height="7" stroke="#FFFFFF" strokeWidth="1.5" fill="none"/>
      <rect x="18" y="7" width="7" height="7" stroke="#FFFFFF" strokeWidth="1.5" fill="none"/>
      <rect x="7" y="18" width="7" height="7" stroke="#FFFFFF" strokeWidth="1.5" fill="none"/>
      <rect x="20" y="20" width="2" height="2" fill="#FFFFFF"/>
      <rect x="18" y="24" width="2" height="2" fill="#FFFFFF"/>
      <rect x="23" y="22" width="2" height="2" fill="#FFFFFF"/>
    </svg>
  ),
};

/** Placeholder visual del QR. Reemplazar por el QR real de Cuenta DNI de Innova
    cuando se reciba (export PNG/SVG desde la app y poner como src de un <img>). */
function QrPlaceholder() {
  // Patrón pseudo-aleatorio pero determinístico (no JS-random) para que se
  // vea como un QR real y no como un ruido cualquiera.
  const cells = [];
  const size = 21;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Marcadores de posición (esquinas) — característicos de los QR
      const inFinder =
        (x < 7 && y < 7) ||
        (x >= size - 7 && y < 7) ||
        (x < 7 && y >= size - 7);
      const finderEdge = inFinder &&
        ((x === 0 || x === 6 || y === 0 || y === 6) ||
         (x >= size - 7 && (x === size - 7 || x === size - 1 || y === 0 || y === 6)) ||
         (y >= size - 7 && (y === size - 7 || y === size - 1 || x === 0 || x === 6)));
      const finderCenter = inFinder &&
        ((x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
         (x >= size - 5 && x <= size - 3 && y >= 2 && y <= 4) ||
         (x >= 2 && x <= 4 && y >= size - 5 && y <= size - 3));
      const dataCell = !inFinder && ((x * 7 + y * 13 + x * y) % 3 === 0);
      if (finderEdge || finderCenter || dataCell) {
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#153F71" />);
      }
    }
  }
  return (
    <svg viewBox="0 0 21 21" width="180" height="180" aria-label="Código QR de Cuenta DNI">
      <rect width="21" height="21" fill="#FFFFFF" />
      {cells}
    </svg>
  );
}

function PaymentOption({ id, icon, title, subtitle, badge, expanded, onClick, children }) {
  return (
    <div className={`${styles.option} ${expanded ? styles.optionExpanded : ''}`}>
      <button
        type="button"
        className={styles.optionHeader}
        onClick={onClick}
        aria-expanded={expanded}
        aria-controls={`payment-${id}`}
      >
        <span className={styles.optionIcon}>{icon}</span>
        <span className={styles.optionMeta}>
          <span className={styles.optionTitle}>{title}</span>
          <span className={styles.optionSubtitle}>{subtitle}</span>
        </span>
        {badge && <span className={styles.optionBadge}>{badge}</span>}
      </button>
      {expanded && (
        <div id={`payment-${id}`} className={styles.optionBody}>
          {children}
        </div>
      )}
    </div>
  );
}

function PaymentModal({ open, onClose, product }) {
  const [expanded, setExpanded] = useState('mp');
  const dialogRef = useRef(null);

  // Cierra con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Bloquea scroll del body
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const toggleOption = (id) => setExpanded((prev) => (prev === id ? '' : id));

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="payment-modal-title" className={styles.title}>Elegí tu medio de pago</h2>
            <p className={styles.subtitle}>
              Seleccioná cómo querés abonar tu inscripción{product?.title ? ` a ${product.title}` : ''}.
              <br />
              <strong>Valor: {CAPSULA_PRICE}</strong>
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </header>

        <div className={styles.options}>
          <PaymentOption
            id="mp"
            icon={ICONS.mp}
            title="Mercado Pago"
            subtitle="Tarjeta, débito, crédito, QR"
            badge="Recomendado"
            expanded={expanded === 'mp'}
            onClick={() => toggleOption('mp')}
          >
            <p className={styles.optionDescription}>
              Pagá de forma segura con Mercado Pago. Aceptamos todas las tarjetas, débito y saldo en cuenta.
            </p>
            <Button
              variant="secondary"
              size="md"
              as="a"
              href={MERCADOPAGO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.optionCta}
            >
              Pagar con Mercado Pago
            </Button>
          </PaymentOption>

          <PaymentOption
            id="cuentadni"
            icon={ICONS.qr}
            title="Cuenta DNI"
            subtitle="Escaneá el QR o tocá para pagar"
            expanded={expanded === 'cuentadni'}
            onClick={() => toggleOption('cuentadni')}
          >
            <p className={styles.optionDescription}>
              Escaneá el código QR con tu app de Cuenta DNI o hacé click sobre el código si estás
              desde tu computadora.
            </p>
            <a
              href={CUENTA_DNI_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.qrLink}
              aria-label="Pagar con Cuenta DNI — abrir link de pago"
            >
              <QrPlaceholder />
            </a>
            <p className={styles.qrHelp}>
              Una vez completado el pago, te llegará un email de confirmación con el acceso a la cápsula.
            </p>
          </PaymentOption>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
