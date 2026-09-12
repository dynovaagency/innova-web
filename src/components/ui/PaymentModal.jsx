import { useEffect, useMemo, useRef, useState } from 'react';
import { generateExternalReference } from '../../lib/paymentUtils.js';
import { formatCurrency } from '../../lib/paymentConfig.js';
import { PAYMENT_METHODS, getPaymentMethodConfig } from '../../lib/paymentMethodsConfig.js';
import TransferenciaFlow from './TransferenciaFlow.jsx';
import PaywayFlow from './PaywayFlow.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import LoginModal from '../auth/LoginModal.jsx';
import styles from './PaymentModal.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modal genérico de compra — presenta al usuario los métodos de pago
 * habilitados para el producto y arranca el flujo correspondiente
 * según la elección.
 *
 * Props:
 *   open: boolean — controla visibilidad.
 *   onClose: () => void — se llama al cerrar.
 *   product: { slug, title, price, priceTransferencia, priceGocuotas,
 *              currency, modalidad, gocuotasUrl } — el producto activo.
 *
 * Estados internos:
 *   step: 'select' → 'transferencia' | 'gocuotas' | 'payway' | 'mercadopago'
 *   email: email del comprador (validado)
 *   selectedMethod: id del método elegido
 *   submitting: true durante init de MP
 *   externalReference: se genera al arrancar cualquier flow para trackear
 *   error: mensaje de error de red o backend
 */
function PaymentModal({ open, onClose, product }) {
  const [step, setStep] = useState('select');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const { user, profile } = useAuthContext();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [externalReference, setExternalReference] = useState(null);
  const [error, setError] = useState(null);
  const closeButtonRef = useRef(null);

  const emailValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const emailShowError = emailTouched && email.length > 0 && !emailValid;
  const canSubmit = emailValid && selectedMethod && !submitting;

  // Si el usuario está logueado, prellenar el email con el del profile.
  // No se muestra el input de email en la UI cuando hay sesión.
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

  const handleSelectMethod = (methodId) => {
    setSelectedMethod(methodId);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Generar external reference único para trackear el pago
    const ref = generateExternalReference();
    setExternalReference(ref);

    // Elegir siguiente step según método
    if (selectedMethod === 'mercadopago') {
      handleMercadoPago(ref);
    } else if (selectedMethod === 'transferencia') {
      setStep('transferencia');
    } else if (selectedMethod === 'gocuotas') {
      handleGoCuotas(ref);
    } else if (selectedMethod === 'payway') {
      setStep('payway');
    }
  };

  /**
   * MercadoPago — llama al backend para crear preferencia y redirige
   * al init_point o al mock según env.
   */
  const handleMercadoPago = async (ref) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoSlug: product.slug,
          buyerEmail: email.trim(),
          externalReference: ref,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar el pago');

      // Redirect al checkout (real o mock)
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error('[PaymentModal] MP error:', err);
      setError(
        err.message ||
          'No pudimos iniciar el pago. Refrescá y probá de nuevo, o escribinos si el problema persiste.'
      );
      setSubmitting(false);
    }
  };

  /**
   * Go Cuotas — abre el link específico del producto en una pestaña nueva.
   * El usuario paga en Go Cuotas, y después Innova aprueba manualmente
   * el pago desde el panel admin.
   */
  const handleGoCuotas = async (ref) => {
    if (!product.gocuotasUrl) {
      setError('No hay link de Go Cuotas configurado para este curso. Escribinos por favor.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Registrar el pago pending en nuestro sistema
      const res = await fetch('/.netlify/functions/create-manual-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoSlug: product.slug,
          buyerEmail: email.trim(),
          externalReference: ref,
          provider: 'gocuotas',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar el pago');

      // Abrir Go Cuotas en pestaña nueva
      window.open(product.gocuotasUrl, '_blank', 'noopener,noreferrer');

      // Cerrar el modal
      onClose?.();
    } catch (err) {
      console.error('[PaymentModal] Go Cuotas error:', err);
      setError(
        err.message ||
          'No pudimos registrar tu pago. Refrescá y probá de nuevo, o escribinos si el problema persiste.'
      );
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // Filtrar métodos disponibles según modalidad del producto
  const availableMethods = PAYMENT_METHODS.filter((method) => {
    // Cápsulas: solo MercadoPago (ticket bajo, aprobación automática).
    if (product.modalidad === 'capsula' && method.id !== 'mercadopago') {
      return false;
    }
    // Hotfix: Payway deshabilitado temporalmente porque el QR
    // de producción está fallando. MP vuelve a estar disponible
    // en cursos como fallback. Revertir cuando Innova regenere
    // el QR de Payway.
    if (product.modalidad === 'curso' && method.id === 'payway') {
      return false;
    }
    return true;
  });

  // Renderizar flow específico si estamos en un step no-select
  if (step === 'transferencia') {
    return (
      <TransferenciaFlow
        product={product}
        buyerEmail={email.trim()}
        externalReference={externalReference}
        onClose={onClose}
      />
    );
  }

  if (step === 'payway') {
    return (
      <PaywayFlow
        product={product}
        buyerEmail={email.trim()}
        externalReference={externalReference}
        onClose={onClose}
      />
    );
  }

  // Step 'select' — pantalla principal
  return (
    <>
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onClick={submitting ? undefined : onClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Comprar acceso</p>
            <h2 id="payment-modal-title" className={styles.title}>
              {product.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            ref={closeButtonRef}
            disabled={submitting}
            className={styles.closeBtn}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        {/* Formulario */}
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
            <>
              <label htmlFor="buyer-email" className={styles.label}>
                Tu email
              </label>
              <input
                id="buyer-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                className={emailShowError ? `${styles.input} ${styles.inputError}` : styles.input}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
                disabled={submitting || !!error}
                required
              />
              {emailShowError && (
                <p className={styles.hint}>Ingresá un email válido.</p>
              )}
              <p className={styles.hint}>Te enviaremos el acceso al curso a este email.</p>
            </>
          )}

          {/* Selección de método */}
          <p className={styles.sectionTitle}>Elegí cómo pagar</p>
          <div className={styles.methodsGrid}>
            {availableMethods.map((method) => {
              const isSelected = selectedMethod === method.id;
              const price = getPriceForMethod(product, method.id);
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => handleSelectMethod(method.id)}
                  disabled={submitting}
                  className={`${styles.methodCard} ${isSelected ? styles.methodCardSelected : ''}`}
                >
                  <div className={styles.methodHeader}>
                    <span className={styles.methodName}>{method.label}</span>
                    <span className={styles.methodPrice}>
                      {formatCurrency(price, product.currency)}
                    </span>
                  </div>
                  <p className={styles.methodDescription}>{method.description}</p>
                </button>
              );
            })}
          </div>

          {/* Botón de submit */}
          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={!canSubmit}
              className={styles.submitBtn}
            >
              {submitting
                ? 'Iniciando...'
                : selectedMethod
                  ? `Continuar con ${formatCurrency(getPriceForMethod(product, selectedMethod), product.currency)}`
                  : 'Elegí un método de pago'}
            </button>
          </form>

          {error && (
            <p className={styles.error} role="alert">
              {mapErrorToSpanish(error)}
            </p>
          )}
        </div>
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
 * Devuelve el precio a mostrar según el método elegido.
 * Fallback a `price` genérico si no hay precio específico configurado.
 */
function getPriceForMethod(product, methodId) {
  if (methodId === 'transferencia' && product.priceTransferencia != null) {
    return product.priceTransferencia;
  }
  if (methodId === 'gocuotas' && product.priceGocuotas != null) {
    return product.priceGocuotas;
  }
  return product.price;
}

function mapErrorToSpanish(msg) {
  const s = String(msg).toLowerCase();
  if (s.includes('valid buyeremail')) return 'Ingresá un email válido.';
  if (s.includes('cursoslug es requerido')) return 'Falta el identificador del producto.';
  if (s.includes('producto no encontrado')) return 'Este producto no está disponible por ahora.';
  if (s.includes('mp not configured')) return 'El pago no está configurado. Contactanos por favor.';
  if (s.includes('rate limit')) return 'Muchos intentos. Esperá un momento y probá de nuevo.';
  return String(msg);
}

export default PaymentModal;