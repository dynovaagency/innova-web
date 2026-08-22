import { useEffect, useMemo, useRef, useState } from 'react';
import Button from './Button.jsx';
import { BANK_DETAILS, GOCUOTAS_URL, PAYWAY_QR_URL, PAYMENT_METHODS } from '../../lib/paymentConfig.js';
import styles from './PaymentModal.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modal de compra con selección de método de pago.
 *
 * Métodos soportados:
 *   - Mercado Pago (automático, solo cápsulas).
 *   - Transferencia bancaria (manual, solo cursos).
 *   - Go Cuotas (manual, solo cursos).
 *   - Payway (manual, solo cursos, QR estático).
 *
 * La regla "MP en cápsulas, resto en cursos" está en el .filter() del
 * .map de PAYMENT_METHODS más abajo. Backend refuerza la restricción.
 *
 * Precios por método (transferencia, go_cuotas): si el producto tiene
 * priceTransferencia o priceGocuotas, se usan; si no, el precio base.
 * Payway usa siempre el precio base por ahora (no tiene pricePayway).
 */

const STEP = {
  SELECT: 'select',
  REDIRECTING_MP: 'redirecting_mp',
  CONFIRM_TRANSFERENCIA: 'confirm_transferencia',
  CONFIRM_GOCUOTAS: 'confirm_gocuotas',
  CONFIRM_PAYWAY: 'confirm_payway',
  ERROR: 'error',
};

const formatARS = (amount) => {
  const nf = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `$${nf.format(amount || 0)}`;
};

const resolvePrice = (product, methodId) => {
  if (!product) return 0;
  if (methodId === 'transferencia' && product.priceTransferencia) return product.priceTransferencia;
  if (methodId === 'gocuotas' && product.priceGocuotas) return product.priceGocuotas;
  return product.price;
};

function PaymentModal({ open, onClose, product, subtitle }) {
  const [step, setStep] = useState(STEP.SELECT);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const closeRef = useRef(null);

  const emailValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const emailShowError = emailTouched && email.length > 0 && !emailValid;

  const effectivePrice = useMemo(() => {
    if (!selectedMethod || !product) return product?.price || 0;
    return resolvePrice(product, selectedMethod.id);
  }, [selectedMethod, product]);

  const gocuotasLink = product?.gocuotasUrl || GOCUOTAS_URL;

  useEffect(() => {
    if (!open) {
      setStep(STEP.SELECT);
      setSelectedMethod(null);
      setEmail('');
      setEmailTouched(false);
      setError('');
      setCopyFeedback('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && step !== STEP.REDIRECTING_MP) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, step]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => closeRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Si es cápsula, pre-seleccionar MP automáticamente (único método permitido).
  useEffect(() => {
    if (open && product?.modalidad === 'capsula' && !selectedMethod) {
      const mp = PAYMENT_METHODS.find((m) => m.id === 'mercadopago');
      if (mp) setSelectedMethod(mp);
    }
  }, [open, product, selectedMethod]);

  if (!open) return null;
  if (!product) return null;

  const handlePay = async () => {
    if (!emailValid || !selectedMethod) {
      setEmailTouched(true);
      return;
    }

    const trimmedEmail = email.trim();

    if (selectedMethod.handler === 'automatic') {
      setStep(STEP.REDIRECTING_MP);
      setError('');
      try {
        const res = await fetch('/.netlify/functions/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cursoSlug: product.slug, buyerEmail: trimmedEmail }),
        });
        const body = await res.json();
        if (!res.ok || !body.initPoint) {
          throw new Error(body.error || 'No pudimos iniciar el pago');
        }
        window.location.href = body.initPoint;
      } catch (err) {
        setError(err.message || 'Hubo un problema al iniciar el pago');
        setStep(STEP.ERROR);
      }
      return;
    }

    // Flujos manuales (transferencia, gocuotas, payway)
    setError('');
    try {
      const res = await fetch('/.netlify/functions/create-manual-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoSlug: product.slug,
          buyerEmail: trimmedEmail,
          paymentMethod: selectedMethod.id,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'No pudimos registrar el pago');
      }
      if (selectedMethod.id === 'transferencia') {
        setStep(STEP.CONFIRM_TRANSFERENCIA);
      } else if (selectedMethod.id === 'gocuotas') {
        setStep(STEP.CONFIRM_GOCUOTAS);
      } else if (selectedMethod.id === 'payway') {
        setStep(STEP.CONFIRM_PAYWAY);
      }
    } catch (err) {
      setError(err.message || 'Hubo un problema al registrar el pago');
      setStep(STEP.ERROR);
    }
  };

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${label} copiado`);
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch {
      setCopyFeedback('No se pudo copiar');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  };

  const canClose = step !== STEP.REDIRECTING_MP;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onClick={canClose ? onClose : undefined}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.headerText}>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            <h2 id="payment-modal-title" className={styles.title}>
              {product.title}
            </h2>
            <p className={styles.price}>
              {formatARS(product.price)} <span className={styles.priceCurrency}>{product.currency || 'ARS'}</span>
            </p>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              ref={closeRef}
              className={styles.closeBtn}
              aria-label="Cerrar"
            >
              ✕
            </button>
          )}
        </header>

        {/* PASO 1: Selección de método + email */}
        {step === STEP.SELECT && (
          <>
            <div className={styles.body}>
              <label htmlFor="payment-email" className={styles.emailLabel}>
                Tu email <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="payment-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={emailShowError}
                aria-describedby={emailShowError ? 'email-hint' : 'email-help'}
                className={
                  emailShowError
                    ? `${styles.emailInput} ${styles.emailInputError}`
                    : styles.emailInput
                }
                placeholder="tu@email.com"
                required
              />
              {emailShowError ? (
                <p id="email-hint" className={styles.emailError}>
                  Ingresá un email válido para recibir el acceso.
                </p>
              ) : (
                <p id="email-help" className={styles.emailHelp}>
                  Te vamos a enviar el acceso a este mail.
                </p>
              )}

              <p className={styles.methodsLabel}>Elegí cómo querés pagar</p>
              <div className={styles.methodsList} role="radiogroup" aria-label="Método de pago">
                {PAYMENT_METHODS
                  .filter((method) => {
                    // Cápsulas: solo MercadoPago.
                    if (product.modalidad === 'capsula' && method.id !== 'mercadopago') {
                      return false;
                    }
                    // Cursos: excluir MercadoPago.
                    if (product.modalidad === 'curso' && method.id === 'mercadopago') {
                      return false;
                    }
                    return true;
                  })
                  .map((method) => {
                    const selected = selectedMethod?.id === method.id;
                    const methodPrice = resolvePrice(product, method.id);
                    const isDiscounted = methodPrice < product.price;

                    return (
                      <button
                        key={method.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedMethod(method)}
                        className={`${styles.methodCard} ${
                          selected ? styles.methodCardSelected : ''
                        }`}
                      >
                        <span className={styles.methodMark} aria-hidden="true" />
                        <span className={styles.methodText}>
                          <span className={styles.methodTopRow}>
                            <span className={styles.methodLabel}>{method.label}</span>
                            <span className={styles.methodPriceGroup}>
                              <span className={styles.methodPrice}>{formatARS(methodPrice)}</span>
                              {isDiscounted && (
                                <span className={styles.methodDiscountBadge}>OFERTA</span>
                              )}
                            </span>
                          </span>
                          <span className={styles.methodDescription}>{method.description}</span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className={styles.actions}>
              <Button
                variant="primary"
                size="lg"
                onClick={handlePay}
                disabled={!emailValid || !selectedMethod}
              >
                {selectedMethod?.handler === 'automatic'
                  ? `Pagar ${formatARS(effectivePrice)} con Mercado Pago`
                  : selectedMethod
                  ? `Continuar con ${formatARS(effectivePrice)}`
                  : 'Elegí un método'}
              </Button>
            </div>
          </>
        )}

        {/* PASO 2A: Redirigiendo a MP */}
        {step === STEP.REDIRECTING_MP && (
          <div className={styles.body}>
            <div className={styles.stateBox}>
              <div className={styles.spinner} aria-hidden="true" />
              <p className={styles.stateText}>Iniciando pago con Mercado Pago...</p>
              <p className={styles.stateHelp}>En un momento vas a ser redirigido.</p>
            </div>
          </div>
        )}

        {/* PASO 2B: Confirmación de Transferencia */}
        {step === STEP.CONFIRM_TRANSFERENCIA && (
          <>
            <div className={styles.body}>
              <h3 className={styles.confirmTitle}>Datos para transferir</h3>
              <p className={styles.confirmIntro}>
                Realizá la transferencia por <strong>{formatARS(effectivePrice)}</strong> a los siguientes datos:
              </p>

              <dl className={styles.bankDetails}>
                <div className={styles.bankRow}>
                  <dt>Titular</dt>
                  <dd>{BANK_DETAILS.titular}</dd>
                </div>
                <div className={styles.bankRow}>
                  <dt>CBU</dt>
                  <dd>
                    <code>{BANK_DETAILS.cbu}</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(BANK_DETAILS.cbu, 'CBU')}
                      className={styles.copyBtn}
                      aria-label="Copiar CBU"
                    >
                      Copiar
                    </button>
                  </dd>
                </div>
                <div className={styles.bankRow}>
                  <dt>Alias</dt>
                  <dd>
                    <code>{BANK_DETAILS.alias}</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(BANK_DETAILS.alias, 'Alias')}
                      className={styles.copyBtn}
                      aria-label="Copiar alias"
                    >
                      Copiar
                    </button>
                  </dd>
                </div>
                <div className={styles.bankRow}>
                  <dt>Cuenta</dt>
                  <dd>{BANK_DETAILS.tipoCuenta} · Nº {BANK_DETAILS.cuenta} · Sucursal {BANK_DETAILS.sucursal}</dd>
                </div>
              </dl>

              {copyFeedback && (
                <p className={styles.copyFeedback} role="status">{copyFeedback}</p>
              )}

              <div className={styles.confirmMessage}>
                <p>
                  Cuando confirmemos la transferencia, te enviamos el link de acceso al mail{' '}
                  <strong>{email}</strong>.
                </p>
                <p className={styles.confirmSmall}>
                  Este proceso puede tardar 24-48 hs hábiles.
                </p>
              </div>
            </div>

            <div className={styles.actions}>
              <Button variant="primary" size="lg" onClick={onClose}>
                Entendido, cerrar
              </Button>
            </div>
          </>
        )}

        {/* PASO 2C: Confirmación de Go Cuotas */}
        {step === STEP.CONFIRM_GOCUOTAS && (
          <>
            <div className={styles.body}>
              <h3 className={styles.confirmTitle}>Completá el pago en Go Cuotas</h3>
              <p className={styles.confirmIntro}>
                Vas a ser redirigido al sitio de Go Cuotas para completar el pago por{' '}
                <strong>{formatARS(effectivePrice)}</strong>.
              </p>

              <div className={styles.gocuotasCta}>
                <a
                  href={gocuotasLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.gocuotasLink}
                >
                  Ir a Go Cuotas →
                </a>
              </div>

              <div className={styles.confirmMessage}>
                <p>
                  Cuando confirmemos el pago desde Go Cuotas, te enviamos el link de acceso al mail{' '}
                  <strong>{email}</strong>.
                </p>
                <p className={styles.confirmSmall}>
                  Este proceso puede tardar unos minutos hasta unas horas.
                </p>
              </div>
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" size="lg" onClick={onClose}>
                Entendido, cerrar
              </Button>
            </div>
          </>
        )}

        {/* PASO 2D: Confirmación de Payway */}
        {step === STEP.CONFIRM_PAYWAY && (
          <>
            <div className={styles.body}>
              <h3 className={styles.confirmTitle}>Escaneá el QR para pagar</h3>
              <p className={styles.confirmIntro}>
                Abrí tu billetera favorita (Modo, Mercado Pago, Cuenta DNI o NaranjaX) y escaneá el QR para completar el pago por <strong>{formatARS(effectivePrice)}</strong>.
              </p>

              <div className={styles.paywayQrWrap}>
                <img
                  src={PAYWAY_QR_URL}
                  alt="Código QR de Payway para pagar"
                  className={styles.paywayQrImage}
                />
              </div>

              <div className={styles.confirmMessage}>
                <p>
                  Cuando confirmemos el pago, te enviamos el link de acceso al mail{' '}
                  <strong>{email}</strong>.
                </p>
                <p className={styles.confirmSmall}>
                  Este proceso puede tardar unos minutos hasta unas horas.
                </p>
              </div>
            </div>

            <div className={styles.actions}>
              <Button variant="secondary" size="lg" onClick={onClose}>
                Entendido, cerrar
              </Button>
            </div>
          </>
        )}

        {/* PASO ERROR */}
        {step === STEP.ERROR && (
          <>
            <div className={styles.body}>
              <div className={styles.stateBox}>
                <p className={styles.stateText}>Algo salió mal</p>
                <p className={styles.stateHelp}>{error || 'Intentá de nuevo en unos segundos.'}</p>
              </div>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" size="lg" onClick={() => setStep(STEP.SELECT)}>
                Volver a intentar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PaymentModal;