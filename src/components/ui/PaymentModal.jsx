import { useEffect, useRef } from 'react';
import Button from './Button.jsx';
import styles from './PaymentModal.module.css';

/**
 * Modal "Confirmá tu inscripción".
 *
 * MVP: única pasarela = Mercado Pago. Al confirmar, se abre el link de cobro
 * de MP en una pestaña nueva. La redirección post-pago exitoso (back al
 * curso) está configurada del lado de Mercado Pago, en el panel del link:
 *
 *   success_url → https://innovatrabajosocial.com.ar/curso/vulnerabilidad-social
 *   failure_url → https://innovatrabajosocial.com.ar/servicios/capsula-formativa
 *   pending_url → https://innovatrabajosocial.com.ar/servicios/capsula-formativa
 *
 * Fase 2: se sumará Cuenta DNI con verificación automática vía backend.
 * El asset del QR sigue disponible en src/assets/payment/cuentadni-qr.jpg
 * para no perder trabajo hecho.
 *
 * Props:
 *   - open: boolean  → controla si está visible
 *   - onClose: () => void  → callback al cerrar
 *   - product: { title, price }  → cápsula que se está comprando
 */

const MERCADOPAGO_LINK = 'https://mpago.li/17xr3Mr';
const CAPSULA_PRICE = '$ 28.000';

function PaymentModal({ open, onClose, product }) {
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
            <h2 id="payment-modal-title" className={styles.title}>Confirmá tu inscripción</h2>
            <p className={styles.subtitle}>
              {product?.title ? `Estás por inscribirte a ${product.title}.` : 'Estás por inscribirte a esta cápsula.'}
              <br />
              <strong>Total: {CAPSULA_PRICE}</strong>
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </header>

        <div className={styles.mpSection}>
          <div className={styles.mpIntro}>
            <span className={styles.mpBadge}>
              <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
                <rect width="32" height="32" rx="6" fill="#82C6C5" />
                <text x="16" y="20" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="11" fill="#153F71">MP</text>
              </svg>
              <span>
                <span className={styles.mpTitle}>Mercado Pago</span>
                <span className={styles.mpSubtitle}>Tarjeta, débito, crédito o saldo en cuenta</span>
              </span>
            </span>
          </div>

          <p className={styles.mpDescription}>
            Al confirmar, te redirigimos a Mercado Pago para completar el pago de forma segura.
            Una vez acreditado, vas a ser dirigido automáticamente a la cápsula para comenzar el curso.
          </p>

          <Button
            variant="secondary"
            size="md"
            as="a"
            href={MERCADOPAGO_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mpCta}
          >
            Pagar con Mercado Pago
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>

          <p className={styles.mpHelp}>
            Si tenés problemas con el pago, escribinos a{' '}
            <a href="mailto:innovatrabajosocial@trabajosocial.ar">innovatrabajosocial@trabajosocial.ar</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
