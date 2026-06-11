import { useEffect, useState, useRef } from 'react';
import Button from './Button.jsx';
import styles from './PaymentModal.module.css';

/**
 * Modal "Elegí tu medio de pago".
 * Cuatro opciones acordeón: Mercado Pago (recomendado), Transferencia/Cuenta DNI,
 * PayPal y Payway (deshabilitado, "Disponible próximamente").
 *
 * Props:
 *   - open: boolean  → controla si está visible
 *   - onClose: () => void  → callback al cerrar
 *   - product: { title, price }  → cápsula que se está comprando
 *   - bankAccount: { titular, cvu, alias, cbu }  → datos para el flujo de transferencia
 */

const ICONS = {
  mp: (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#82C6C5" />
      <text x="16" y="20" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="11" fill="#153F71">MP</text>
    </svg>
  ),
  bank: (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#E8E4DC" />
      <path d="M8 14L16 8L24 14V15H8V14ZM10 16H12V22H10V16ZM15 16H17V22H15V16ZM20 16H22V22H20V16ZM8 23H24V25H8V23Z" fill="#153F71"/>
    </svg>
  ),
  paypal: (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#153F71" />
      <text x="16" y="20" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="10" fill="#FFFFFF">PP</text>
    </svg>
  ),
  card: (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#F4F1EB" />
      <rect x="7" y="11" width="18" height="11" rx="1.5" stroke="#6B6C6F" strokeWidth="1.5" fill="none"/>
      <line x1="7" y1="14.5" x2="25" y2="14.5" stroke="#6B6C6F" strokeWidth="1.5"/>
    </svg>
  ),
};

function PaymentOption({ id, icon, title, subtitle, badge, disabled, expanded, onClick, children }) {
  return (
    <div className={`${styles.option} ${expanded ? styles.optionExpanded : ''} ${disabled ? styles.optionDisabled : ''}`}>
      <button
        type="button"
        className={styles.optionHeader}
        onClick={onClick}
        disabled={disabled}
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
      {expanded && !disabled && (
        <div id={`payment-${id}`} className={styles.optionBody}>
          {children}
        </div>
      )}
    </div>
  );
}

function PaymentModal({ open, onClose, product, bankAccount }) {
  const [expanded, setExpanded] = useState('mp');
  const [transferForm, setTransferForm] = useState({
    name: '',
    email: '',
    amount: '',
    file: null,
  });
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

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    // Por ahora — placeholder. El submit real va a Web3Forms o Formspree
    // y dispara un email a Innova con los datos del comprador + comprobante.
    console.log('Transfer form submit:', transferForm, 'for product:', product);
    alert('Comprobante enviado. Innova te contactará en las próximas horas hábiles con el acceso al curso.');
    onClose();
  };

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
            <p className={styles.subtitle}>Seleccioná cómo querés abonar tu inscripción{product?.title ? ` a ${product.title}` : ''}.</p>
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
            <Button variant="secondary" size="md" as="a" href="#" className={styles.optionCta}>
              Pagar con Mercado Pago
            </Button>
          </PaymentOption>

          <PaymentOption
            id="transfer"
            icon={ICONS.bank}
            title="Transferencia / Cuenta DNI"
            subtitle="CVU, CBU o alias"
            expanded={expanded === 'transfer'}
            onClick={() => toggleOption('transfer')}
          >
            <div className={styles.bankCard}>
              <h3 className={styles.bankTitle}>Datos de cuenta Innova</h3>
              <dl className={styles.bankList}>
                <div><dt>Titular:</dt><dd>{bankAccount?.titular || 'Innova Capacitaciones'}</dd></div>
                <div><dt>CVU:</dt><dd>{bankAccount?.cvu || '0000003100098765432100'}</dd></div>
                <div><dt>Alias:</dt><dd>{bankAccount?.alias || 'INNOVA.PAGO'}</dd></div>
                <div><dt>CBU:</dt><dd>{bankAccount?.cbu || '0720479420000001234567'}</dd></div>
              </dl>
            </div>

            <form onSubmit={handleTransferSubmit} className={styles.transferForm}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Tu nombre completo</span>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Nombre y apellido"
                  value={transferForm.name}
                  onChange={(e) => setTransferForm({ ...transferForm, name: e.target.value })}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Tu email</span>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="ejemplo@email.com"
                  value={transferForm.email}
                  onChange={(e) => setTransferForm({ ...transferForm, email: e.target.value })}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Monto transferido</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className={styles.input}
                  placeholder="$ 0,00"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Comprobante (imagen o PDF)</span>
                <span className={styles.fileWrap}>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className={styles.fileInput}
                    onChange={(e) => setTransferForm({ ...transferForm, file: e.target.files?.[0] || null })}
                    required
                  />
                  <span className={styles.fileButton}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    {transferForm.file ? transferForm.file.name : 'Adjuntar comprobante'}
                  </span>
                </span>
              </label>
              <Button type="submit" variant="dark" size="md" className={styles.submitBtn}>
                Enviar comprobante
              </Button>
            </form>
          </PaymentOption>

          <PaymentOption
            id="paypal"
            icon={ICONS.paypal}
            title="PayPal"
            subtitle="Cuenta PayPal o tarjeta internacional"
            expanded={expanded === 'paypal'}
            onClick={() => toggleOption('paypal')}
          >
            <p className={styles.optionDescription}>
              Ideal si pagás desde el exterior. Aceptamos tarjetas internacionales vía PayPal.
            </p>
            <Button variant="dark" size="md" as="a" href="#" className={styles.optionCta}>
              Pagar con PayPal
            </Button>
          </PaymentOption>

          <PaymentOption
            id="payway"
            icon={ICONS.card}
            title="Payway / Tarjeta de crédito"
            subtitle="Visa, Mastercard, Amex"
            badge="Disponible próximamente"
            disabled
            onClick={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
