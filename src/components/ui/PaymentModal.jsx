import { useEffect, useState, useRef } from 'react';
import Button from './Button.jsx';
import styles from './PaymentModal.module.css';

/**
 * Modal "Confirmá tu inscripción".
 *
 * MVP con backend mínimo:
 *   1. Al confirmar, pega POST a /.netlify/functions/create-preference con
 *      el slug del curso.
 *   2. Recibe { initPoint, externalReference } y redirige al usuario a MP.
 *   3. MP procesa el pago y redirige a /curso/:slug?ref=... o /pago-pendiente
 *      o /pago-fallido, según el estado.
 *   4. La página del curso verifica el ref contra /verify-payment antes de
 *      mostrar el iframe.
 *
 * Modo mock: si el backend responde con { mock: true }, en vez de redirigir
 * a MP redirige a /mock-checkout, una pantalla local que simula el pago.
 *
 * Props:
 *   - open: boolean
 *   - onClose: () => void
 *   - product: { slug, title, price }
 */

const CAPSULA_PRICE = '$ 28.000';

function PaymentModal({ open, onClose, product }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !loading && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, loading]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Reset del estado interno al cerrar
  useEffect(() => {
    if (!open) {
      setErrorMsg('');
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handlePay = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/.netlify/functions/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoSlug: product?.slug || 'vulnerabilidad-social',
          buyerEmail: email || undefined,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'No se pudo iniciar el pago');
      }

      const data = await res.json();
      if (!data.initPoint) {
        throw new Error('Respuesta inválida del servidor');
      }

      // Redirigimos al Checkout Pro de MP (o al mock en desarrollo)
      window.location.href = data.initPoint;
    } catch (err) {
      console.error('Error al crear preferencia:', err);
      setErrorMsg(err.message || 'No se pudo iniciar el pago. Intentá de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={loading ? undefined : onClose} role="presentation">
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
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar"
            disabled={loading}
          >
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
            Al confirmar, vas a ser dirigido a Mercado Pago para completar el pago.
            Una vez acreditado, te llevamos automáticamente a la cápsula.
          </p>

          <label className={styles.emailField}>
            <span>Tu email (para el comprobante)</span>
            <input
              type="email"
              placeholder="ejemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </label>

          {errorMsg && (
            <div className={styles.errorBox} role="alert">
              {errorMsg}
            </div>
          )}

          <Button
            variant="secondary"
            size="md"
            onClick={handlePay}
            disabled={loading}
            className={styles.mpCta}
          >
            {loading ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                Iniciando pago...
              </>
            ) : (
              <>
                Pagar con Mercado Pago
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
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
