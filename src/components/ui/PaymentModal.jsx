import { useEffect, useMemo, useRef, useState } from 'react';
import { Tag } from 'lucide-react';
import { formatCurrency } from '../../lib/format.js';
import { useAuthContext } from '../../context/AuthContext.jsx';
import LoginModal from '../auth/LoginModal.jsx';
import styles from './PaymentModal.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modal de compra — presenta los métodos de pago habilitados para el
 * producto y arranca el flujo correspondiente.
 *
 * Flujos:
 *  - Mercado Pago: redirige al checkout externo.
 *  - Transferencia: muestra los datos bancarios inline.
 *  - Go Cuotas: registra el pago pendiente y redirige al link del producto.
 *
 * Cupones:
 *  - Disponibles solo en métodos donde controlamos el monto (COUPON_METHODS).
 *  - El frontend solo muestra el descuento; el backend lo recalcula y aplica.
 *
 * Props:
 *   open, onClose, product: { slug, title, price, priceTransferencia,
 *                             priceGocuotas, currency, modalidad, gocuotasUrl }
 */

const PAYMENT_METHODS = [
  {
    id: 'mercadopago',
    label: 'Mercado Pago',
    description: 'Tarjetas, transferencia o efectivo',
    applicableFor: ['capsula', 'curso'],
  },
  {
    id: 'transferencia',
    label: 'Transferencia bancaria',
    description: 'Directo a la cuenta de Innova',
    applicableFor: ['curso'],
  },
  {
    id: 'gocuotas',
    label: 'Go Cuotas',
    description: 'Financiación en cuotas sin tarjeta',
    applicableFor: ['curso'],
  },
];

// Sincronizado con COUPON_METHODS del backend (_lib/coupons.js).
const COUPON_METHODS = ['mercadopago', 'transferencia'];

function PaymentModal({ open, onClose, product }) {
  const [step, setStep] = useState('select'); // 'select' | 'transferencia'
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const { user, profile } = useAuthContext();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [externalReference, setExternalReference] = useState(null);
  const [paidAmount, setPaidAmount] = useState(null);
  const [copyToast, setCopyToast] = useState(null);
  const [error, setError] = useState(null);
  const closeButtonRef = useRef(null);

  // Cupón
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);
  const [couponNotice, setCouponNotice] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  // appliedCoupon: { code, method, originalAmount, discountApplied, finalAmount }

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
      setPaidAmount(null);
      setError(null);
      setCopyToast(null);
      setCouponOpen(false);
      setCouponInput('');
      setCouponLoading(false);
      setCouponError(null);
      setCouponNotice(null);
      setAppliedCoupon(null);
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

  // Precio base según método elegido
  const getPriceForMethod = (methodId) => {
    if (methodId === 'transferencia' && product.priceTransferencia != null) {
      return product.priceTransferencia;
    }
    if (methodId === 'gocuotas' && product.priceGocuotas != null) {
      return product.priceGocuotas;
    }
    return product.price;
  };

  const couponActive = appliedCoupon && appliedCoupon.method === selectedMethod;

  const currentPrice = selectedMethod
    ? couponActive
      ? appliedCoupon.finalAmount
      : getPriceForMethod(selectedMethod)
    : product.price;

  const canProceed = emailValid && selectedMethod && !submitting && !couponLoading;

  // ---------------- Cupones ----------------

  /**
   * Valida un código contra el backend. Nunca lanza: devuelve
   * { valid: true, ... } o { valid: false, message }.
   */
  const requestCouponValidation = async (code, methodId) => {
    try {
      const res = await fetch('/.netlify/functions/coupons-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          cursoSlug: product.slug,
          paymentMethod: methodId,
          buyerEmail: emailValid ? email.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { valid: false, message: data.error || 'No pudimos validar el código.' };
      }
      return data;
    } catch (err) {
      console.error('[PaymentModal] error validando cupón:', err);
      return { valid: false, message: 'No pudimos conectarnos con el servidor. Probá de nuevo.' };
    }
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Ingresá un código.');
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    setCouponNotice(null);

    const result = await requestCouponValidation(code, selectedMethod);
    setCouponLoading(false);

    if (!result.valid) {
      setCouponError(result.message);
      return;
    }

    setAppliedCoupon({
      code: result.code,
      method: selectedMethod,
      originalAmount: result.originalAmount,
      discountApplied: result.discountApplied,
      finalAmount: result.finalAmount,
    });
    setCouponInput('');
    setCouponOpen(false);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponNotice(null);
    setCouponError(null);
  };

  /**
   * Al cambiar de método con un cupón aplicado:
   *  - Si el nuevo método no admite cupones, se quita y se avisa.
   *  - Si lo admite, se revalida (el precio base cambia según el método).
   */
  const handleSelectMethod = async (methodId) => {
    setSelectedMethod(methodId);
    setError(null);
    setCouponNotice(null);
    setCouponError(null);

    if (!appliedCoupon || appliedCoupon.method === methodId) return;

    const code = appliedCoupon.code;

    if (!COUPON_METHODS.includes(methodId)) {
      setAppliedCoupon(null);
      setCouponNotice(`El código ${code} no aplica a este medio de pago, así que quitamos el descuento.`);
      return;
    }

    setCouponLoading(true);
    const result = await requestCouponValidation(code, methodId);
    setCouponLoading(false);

    if (result.valid) {
      setAppliedCoupon({
        code: result.code,
        method: methodId,
        originalAmount: result.originalAmount,
        discountApplied: result.discountApplied,
        finalAmount: result.finalAmount,
      });
    } else {
      setAppliedCoupon(null);
      setCouponNotice(result.message);
    }
  };

  /**
   * Si el backend rechaza el cupón al crear el pago (por ejemplo, se agotó
   * mientras el alumno completaba el formulario), lo quitamos y avisamos.
   */
  const handleBackendError = (data, fallback) => {
    if (data?.reason && appliedCoupon) {
      setAppliedCoupon(null);
      setError(`${data.error} Quitamos el descuento: podés continuar con el precio normal.`);
    } else {
      setError(data?.error || fallback);
    }
  };

  const couponCodeForRequest = couponActive ? appliedCoupon.code : undefined;

  // ---------------- Pagos ----------------

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
          couponCode: couponCodeForRequest,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        handleBackendError(data, 'No pudimos iniciar el pago. Intentá de nuevo.');
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
          paymentMethod: 'transferencia',
          couponCode: couponCodeForRequest,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        handleBackendError(data, 'No pudimos generar tu pago. Intentá de nuevo.');
        setSubmitting(false);
        return;
      }
      setExternalReference(data.externalReference);
      // El monto a transferir es el que registró el backend.
      setPaidAmount(data.amount);
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
          paymentMethod: 'gocuotas',
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

  const transferAmount = paidAmount ?? currentPrice;

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
                      onClick={() => handleSelectMethod(method.id)}
                      className={isSelected ? `${styles.methodCard} ${styles.methodCardSelected}` : styles.methodCard}
                      disabled={submitting}
                    >
                      <span className={styles.methodRadio} aria-hidden="true" />
                      <span className={styles.methodText}>
                        <span className={styles.methodLabel}>{method.label}</span>
                        <span className={styles.methodDescription}>{method.description}</span>
                      </span>
                      <span className={styles.methodPriceGroup}>
                        <span className={styles.methodPrice}>
                          {formatCurrency(methodPrice, product.currency)}
                        </span>
                        {methodPrice < product.price && (
                          <span className={styles.methodDiscountBadge}>OFERTA</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cupón de descuento */}
            {selectedMethod && (
              <div className={styles.couponArea}>
                {!COUPON_METHODS.includes(selectedMethod) ? (
                  <p className={styles.couponUnavailable}>
                    Los códigos de descuento no están disponibles para pagos con Go Cuotas.
                  </p>
                ) : couponActive ? (
                  <div className={styles.couponSummary}>
                    <div className={styles.couponRow}>
                      <span>Precio</span>
                      <span>{formatCurrency(appliedCoupon.originalAmount, product.currency)}</span>
                    </div>
                    <div className={styles.couponRow}>
                      <span className={styles.couponCode}>
                        <Tag size={14} aria-hidden="true" />
                        {appliedCoupon.code}
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className={styles.couponRemove}
                          disabled={submitting}
                        >
                          Quitar
                        </button>
                      </span>
                      <span className={styles.couponDiscount}>
                        − {formatCurrency(appliedCoupon.discountApplied, product.currency)}
                      </span>
                    </div>
                    <div className={`${styles.couponRow} ${styles.couponRowTotal}`}>
                      <span>Total</span>
                      <span>{formatCurrency(appliedCoupon.finalAmount, product.currency)}</span>
                    </div>
                  </div>
                ) : !couponOpen ? (
                  <button
                    type="button"
                    onClick={() => setCouponOpen(true)}
                    className={styles.couponToggle}
                    disabled={couponLoading}
                  >
                    <Tag size={14} aria-hidden="true" />
                    {couponLoading ? 'Recalculando descuento...' : '¿Tenés un código de descuento?'}
                  </button>
                ) : (
                  <div className={styles.couponForm}>
                    <div className={styles.couponInputRow}>
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase().replace(/\s/g, ''));
                          setCouponError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        className={styles.couponInput}
                        placeholder="Ingresá tu código"
                        maxLength={30}
                        disabled={couponLoading || submitting}
                        aria-label="Código de descuento"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className={styles.couponApplyBtn}
                        disabled={couponLoading || submitting || !couponInput}
                      >
                        {couponLoading ? 'Validando...' : 'Aplicar'}
                      </button>
                    </div>
                    {couponError && (
                      <p className={styles.fieldError} role="alert">{couponError}</p>
                    )}
                  </div>
                )}

                {couponNotice && (
                  <p className={styles.couponNotice} role="status">{couponNotice}</p>
                )}
              </div>
            )}

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
                value={formatCurrency(transferAmount, product.currency)}
                onCopy={() => copyToClipboard(String(transferAmount), 'Monto')}
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