import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCurrency } from '../../lib/format.js';
import { useAuthContext } from '../../context/AuthContext.jsx';
import LoginModal from '../auth/LoginModal.jsx';
import styles from './PaymentModal.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modal genérico de compra — presenta al usuario los métodos de pago
 * habilitados para el producto y arranca el flujo correspondiente.
 *
 * Solo dos flows por ahora:
 *  - MercadoPago (Cápsulas). Redirige al checkout externo.
 *  - Transferencia (Cursos). Muestra los datos bancarios inline.
 *
 * Props:
 *   open: boolean — controla visibilidad.
 *   onClose: () => void — se llama al cerrar.
 *   product: {
 *     slug, title, price, priceTransferencia, priceGocuotas, currency,
 *     modalidad, gocuotasUrl
 *   } — el producto activo.
 */

const PAYMENT_METHODS = [
  {
    id: 'mercadopago',
    label: 'MercadoPago',
    description: 'Tarjeta de débito o crédito. Pago único.',
    applicableFor: ['capsula'],
  },
  {
    id: 'transferencia',
    label: 'Transferencia bancaria',
    description: 'Datos bancarios de Innova. El acceso se activa cuando confirmemos el ingreso.',
    applicableFor: ['curso'],
  },
  {
    id: 'gocuotas',
    label: 'Go Cuotas',
    description: 'Pagá en cuotas sin tarjeta. Te redirigimos al checkout de Go Cuotas.',
    applicableFor: ['curso'],
  },
];

function PaymentModal({ open, onClose, product }) {
  const [step, setStep] = useState('select'); // 'select' | 'transferencia'
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const { user, profile } = useAuthContext();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [externalReference, setExternalReference] = useState(null);
  const [copyToast, setCopyToast] = useState(null);
  const [error, setError] = useState(null);
  const closeButtonRef = useRef(null);

  const emailValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const emailShowError = emailTouched && email.length > 0 && !emailValid;

  // Si el usuario está logueado, prellenar el email con el del profile.
  useEffect(() => {
    if (open && user && profile?.email) {
      setEmail(profile.email);
    }
  }, [open, user, profile?.email]);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setStep('select');
      setEmail('');
      setEmailTouched(false);
      setSelectedMethod(null);
      setSubmitting(false);
      setExternalReference(null);
      setError(null);
      setCopyToast(null);
    }
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, submitting]);

  // Focus al abrir
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Auto-hide del toast de copiado
  useEffect(() => {
    if (!copyToast) return;
    const timer = setTimeout(() => setCopyToast(null), 2000);
    return () => clearTimeout(timer);
  }, [copyToast]);

  if (!open || !product) return null;

  const availableMethods = PAYMENT_METHODS.filter((m) =>
    m.applicableFor.includes(product.modalidad || 'capsula')
  );

  // Precio a mostrar según método elegido
  const getPriceForMethod = (methodId) => {
    if (methodId === 'transferencia' && product.priceTransferencia != null) {
      return product.priceTransferencia;
    }
    if (methodId === 'gocuotas' && product.priceGocuotas != null) {
      return product.priceGocuotas;
    }
    return product.price;
  };

  const currentPrice = selectedMethod
    ? getPriceForMethod(selectedMethod)
    : product.price;

  const canProceed = emailValid && selectedMethod && !submitting;

  const handleProceed = async () => {
    setError(null);
    if (!emailValid || !selectedMethod) {
      setEmailTouched(true);
      return;
    }

    if (selectedMethod === 'mercadopago') {
      await handleMercadoPago();
    } else if (selectedMethod === 'transferencia') {
      await handleTransferencia();
    } else if (selectedMethod === 'gocuotas') {
      await handleGoCuotas();
    }
  };

  const handleMercadoPago = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoSlug: product.slug,
          buyerEmail: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No pudimos iniciar el pago. Intentá de nuevo.');
        setSubmitting(false);
        return;
      }
      window.location.assign(data.initPoint);
    } catch (err) {
      console.error('[PaymentModal] error MP:', err);
      setError('No pudimos conectarnos con el servidor. Refrescá y probá de nuevo.');
      setSubmitting(false);
    }
  };

  const handleTransferencia = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/create-manual-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoSlug: product.slug,
          buyerEmail: email.trim(),
          provider: 'transferencia',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No pudimos generar tu pago. Intentá de nuevo.');
        setSubmitting(false);
        return;
      }
      setExternalReference(data.externalReference);
      setStep('transferencia');
      setSubmitting(false);
    } catch (err) {
      console.error('[PaymentModal] error transferencia:', err);
      setError('No pudimos conectarnos con el servidor. Refrescá y probá de nuevo.');
      setSubmitting(false);
    }
  };

  const handleGoCuotas = async () => {
    if (!product.gocuotasUrl) {
      setError('Este producto todavía no tiene link de Go Cuotas configurado. Contactanos por favor.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/create-manual-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoSlug: product.slug,
          buyerEmail: email.trim(),
          provider: 'gocuotas',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No pudimos generar tu pago. Intentá de nuevo.');
        setSubmitting(false);
        return;
      }
      // Redirigir al link de Go Cuotas del producto
      window.location.assign(product.gocuotasUrl);
    } catch (err) {
      console.error('[PaymentModal] error Go Cuotas:', err);
      setError('No pudimos registrar tu pago. Refrescá y probá de nuevo.');
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(`${label} copiado`);
    } catch {
      setCopyToast('No pudimos copiar. Copialo a mano por favor.');
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  return (
    <>
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onClick={handleClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Inscribite</p>
            <h2 id="payment-modal-title" className={styles.title}>
              {product.title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className={styles.closeBtn}
            aria-label="Cerrar"
            disabled={submitting}
          >
            ✕
          </button>
        </header>

        {step === 'select' && (
          <div className={styles.body}>
            {/* Banner para usuarios no logueados */}
            {!user && (
              <div className={styles.loginBanner}>
                <p className={styles.loginBannerText}>
                  ¿Ya tenés cuenta en INNOVA?{' '}
                  <button
                    type="button"
                    onClick={() => setLoginModalOpen(true)}
                    className={styles.loginBannerLink}
                  >
                    Iniciá sesión
                  </button>
                  {' '}o{' '}
                  <a
                    href="/registro"
                    className={styles.loginBannerLink}
                  >
                    Registrate
                  </a>
                  {' '}para que puedas administrar tus cursos desde tu perfil.
                </p>
              </div>
            )}

            {/* Si está logueado, mostrar email del profile como confirmación */}
            {user && email && (
              <div className={styles.loggedInInfo}>
                <p className={styles.loggedInText}>
                  Comprando como: <strong>{email}</strong>
                </p>
              </div>
            )}

            {/* Input de email — solo visible si NO hay sesión */}
            {!user && (
              <div className={styles.field}>
                <label htmlFor="buyer-email" className={styles.label}>
                  Tu email <span className={styles.required}>*</span>
                </label>
                <input
                  id="buyer-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className={emailShowError ? `${styles.input} ${styles.inputError}` : styles.input}
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  disabled={submitting}
                  required
                />
                {emailShowError && (
                  <p className={styles.fieldError}>Ingresá un email válido.</p>
                )}
                <p className={styles.fieldHint}>
                  Te enviaremos el acceso a esta dirección apenas confirmemos el pago.
                </p>
              </div>
            )}

            <div className={styles.field}>
              <p className={styles.label}>Elegí cómo querés pagar</p>
              <div className={styles.methodsList}>
                {availableMethods.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  const methodPrice = getPriceForMethod(method.id);
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={isSelected ? `${styles.methodCard} ${styles.methodCardSelected}` : styles.methodCard}
                      disabled={submitting}
                    >
                      <div className={styles.methodHeader}>
                        <span className={styles.methodLabel}>{method.label}</span>
                        <span className={styles.methodPrice}>
                          {formatCurrency(methodPrice, product.currency)}
                        </span>
                      </div>
                      <p className={styles.methodDescription}>{method.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className={styles.errorMessage} role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleProceed}
              disabled={!canProceed}
            >
              {submitting
                ? 'Redirigiendo...'
                : selectedMethod
                  ? `Continuar con ${formatCurrency(currentPrice, product.currency)}`
                  : 'Elegí un método para continuar'}
            </button>
          </div>
        )}

        {step === 'transferencia' && (
          <div className={styles.body}>
            <div className={styles.transferBanner}>
              <p className={styles.transferBannerText}>
                Guardá tu comprobante. Enviálo a{' '}
                <a href="mailto:innovatrabajosocial@trabajosocial.ar" className={styles.link}>
                  innovatrabajosocial@trabajosocial.ar
                </a>{' '}
                indicando tu email. Te habilitamos el acceso apenas confirmemos el ingreso.
              </p>
            </div>

            <div className={styles.transferDetails}>
              <TransferField
                label="Titular"
                value="Innova Trabajo Social"
                onCopy={() => copyToClipboard('Innova Trabajo Social', 'Titular')}
              />
              <TransferField
                label="CUIT"
                value="30-71234567-8"
                onCopy={() => copyToClipboard('30-71234567-8', 'CUIT')}
              />
              <TransferField
                label="Banco"
                value="Banco Nación"
                onCopy={() => copyToClipboard('Banco Nación', 'Banco')}
              />
              <TransferField
                label="CBU"
                value="0000000000000000000000"
                onCopy={() => copyToClipboard('0000000000000000000000', 'CBU')}
              />
              <TransferField
                label="Alias"
                value="INNOVA.TRABAJO.SOCIAL"
                onCopy={() => copyToClipboard('INNOVA.TRABAJO.SOCIAL', 'Alias')}
              />
              <TransferField
                label="Monto"
                value={formatCurrency(currentPrice, product.currency)}
                onCopy={() => copyToClipboard(String(currentPrice), 'Monto')}
              />
              <TransferField
                label="Referencia"
                value={externalReference || ''}
                onCopy={() => copyToClipboard(externalReference || '', 'Referencia')}
                mono
              />
            </div>

            <div className={styles.transferActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setStep('select')}
              >
                Volver
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleClose}
              >
                Listo, ya lo copié
              </button>
            </div>
          </div>
        )}

        {copyToast && (
          <div className={styles.copyToast} role="status">
            {copyToast}
          </div>
        )}
      </div>
    </div>

    <LoginModal
      open={loginModalOpen}
      onClose={() => setLoginModalOpen(false)}
    />
    </>
  );
}

/**
 * Row de datos bancarios con botón "copiar".
 */
function TransferField({ label, value, onCopy, mono = false }) {
  return (
    <div className={styles.transferField}>
      <span className={styles.transferLabel}>{label}</span>
      <div className={styles.transferValueRow}>
        <span className={mono ? `${styles.transferValue} ${styles.mono}` : styles.transferValue}>
          {value}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className={styles.copyBtn}
          aria-label={`Copiar ${label}`}
        >
          Copiar
        </button>
      </div>
    </div>
  );
}

export default PaymentModal;