import { useEffect, useMemo, useRef, useState } from 'react';
import Button from './Button.jsx';
import { BANK_DETAILS, GOCUOTAS_URL, PAYMENT_METHODS } from '../../lib/paymentConfig.js';
import styles from './PaymentModal.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Modal de compra con selección de método de pago.
 *
 * Métodos soportados:
 *   - Mercado Pago (automático via webhook, flujo original)
 *   - Transferencia bancaria (manual, aprobación desde panel admin)
 *   - Go Cuotas (manual, link externo)
 *
 * Estados del modal:
 *   - SELECT: usuario elige método + ingresa email (paso 1).
 *   - REDIRECTING_MP: spinner mientras se llama a create-preference.
 *   - CONFIRM_TRANSFERENCIA: muestra datos bancarios + mensaje.
 *   - CONFIRM_GOCUOTAS: botón para abrir Go Cuotas en pestaña nueva.
 *   - ERROR: hubo un error al crear el pago.
 *
 * Props:
 *   - open, onClose, cursoSlug, priceLabel, cursoTitle, subtitle
 */

const STEP = {
  SELECT: 'select',
  REDIRECTING_MP: 'redirecting_mp',
  CONFIRM_TRANSFERENCIA: 'confirm_transferencia',
  CONFIRM_GOCUOTAS: 'confirm_gocuotas',
  ERROR: 'error',
};

function PaymentModal({
  open,
  onClose,
  cursoSlug,
  priceLabel,
  cursoTitle = 'Cápsula Formativa',
  subtitle,
}) {
  const [step, setStep] = useState(STEP.SELECT);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const closeRef = useRef(null);

  const emailValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const emailShowError = emailTouched && email.length > 0 && !emailValid;

  // Reset del estado cuando el modal se cierra o se abre
  useEffect(() => {
    if (!open) {
      // Resetear al cerrar
      setStep(STEP.SELECT);
      setSelectedMethod(null);
      setEmail('');
      setEmailTouched(false);
      setError('');
      setCopyFeedback('');
    }
  }, [open]);

  // Escape para cerrar, bloqueo de scroll
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

  // Focus inicial en el botón close cuando se abre
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => closeRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const handlePay = async () => {
    if (!emailValid || !selectedMethod) {
      setEmailTouched(true);
      return;
    }

    const trimmedEmail = email.trim();

    // Ramificación según método
    if (selectedMethod.handler === 'automatic') {
      // Flujo MP: mismo que hoy
      setStep(STEP.REDIRECTING_MP);
      setError('');
      try {
        const res = await fetch('/.netlify/functions/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cursoSlug, buyerEmail: trimmedEmail }),
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

    // Flujos manuales (transferencia, gocuotas): llaman al endpoint
    // create-manual-payment y cambian el modal a pantalla de confirmación.
    setError('');
    try {
      const res = await fetch('/.netlify/functions/create-manual-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursoSlug,
          buyerEmail: trimmedEmail,
          paymentMethod: selectedMethod.id,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'No pudimos registrar el pago');
      }
      // Cambiar a la pantalla de confirmación correspondiente
      if (selectedMethod.id === 'transferencia') {
        setStep(STEP.CONFIRM_TRANSFERENCIA);
      } else if (selectedMethod.id === 'gocuotas') {
        setStep(STEP.CONFIRM_GOCUOTAS);
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
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerText}>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            <h2 id="payment-modal-title" className={styles.title}>
              {cursoTitle}
            </h2>
            <p className={styles.price}>{priceLabel} ARS</p>
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
                {PAYMENT_METHODS.map((method) => {
                  const selected = selectedMethod?.id === method.id;
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
                        <span className={styles.methodLabel}>{method.label}</span>
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
                  ? 'Pagar con Mercado Pago'
                  : selectedMethod
                  ? 'Continuar'
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
                Realizá la transferencia por <strong>{priceLabel} ARS</strong> a los siguientes datos:
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
                <strong>{priceLabel} ARS</strong>.
              </p>

              <div className={styles.gocuotasCta}>
                
                  href={GOCUOTAS_URL}
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