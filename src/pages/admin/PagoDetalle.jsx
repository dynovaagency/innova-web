import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import LoadingState from '../../components/admin/LoadingState.jsx';
import ErrorState from '../../components/admin/ErrorState.jsx';
import Badge from '../../components/admin/Badge.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import Toast from '../../components/admin/Toast.jsx';
import useToast from '../../hooks/useToast.js';
import { formatCurrency, formatDateTime } from '../../lib/format.js';
import styles from './PagoDetalle.module.css';

/**
 * Vista de detalle de un pago individual.
 *
 * Muestra:
 *   - Información principal (email, monto, curso, estado, timeline).
 *   - Referencias técnicas (externalReference, provider, providerReference).
 *   - Historial de emails (envío automático + reenvíos manuales).
 *   - Provider metadata (para debug avanzado).
 *   - Acción "Reenviar mail" (solo si status === approved).
 */

const statusVariant = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
};

const statusLabel = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
};

function PagoDetalle() {
  const { externalReference } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [payment, setPayment] = useState(null);
  const [accessUrl, setAccessUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirmResend, setConfirmResend] = useState({ open: false, loading: false });
  const [confirmApprove, setConfirmApprove] = useState({ open: false, loading: false });

  const fetchPayment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/.netlify/functions/admin-payment-get?ref=${encodeURIComponent(externalReference)}`,
        { credentials: 'include' }
      );
      if (res.status === 404) {
        setError('Este pago no existe. Puede que la referencia esté mal escrita.');
        return;
      }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setPayment(data.payment);
      setAccessUrl(data.accessUrl || null);
    } catch (err) {
      console.error('[PagoDetalle] fetch error:', err);
      setError(err.message || 'Error cargando el pago');
    } finally {
      setLoading(false);
    }
  }, [externalReference]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  const handleResendConfirm = async () => {
    setConfirmResend((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/.netlify/functions/admin-payment-resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ref: externalReference }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'No se pudo reenviar el email');
      }
      toast.success(
        'Email reenviado',
        `Se envió el acceso a ${body.to}. Puede tardar unos minutos en llegar.`
      );
      setConfirmResend({ open: false, loading: false });
      fetchPayment(); // refrescar para ver resentEmailAt
    } catch (err) {
      console.error('[PagoDetalle] resend error:', err);
      toast.error('No se pudo reenviar', err.message);
      setConfirmResend((prev) => ({ ...prev, loading: false }));
    }
    setConfirmApprove((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/.netlify/functions/admin-payment-mark-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ref: externalReference }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'No se pudo aprobar el pago');
      }
      toast.success(
        'Pago aprobado',
        body.emailSent
          ? `Se envió el acceso a ${body.to}.`
          : `Pago aprobado. El email no se pudo enviar automáticamente — reintentá con "Reenviar acceso".`
      );
      setConfirmApprove({ open: false, loading: false });
      fetchPayment();
    } catch (err) {
      console.error('[PagoDetalle] approve error:', err);
      toast.error('No se pudo aprobar', err.message);
      setConfirmApprove((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleApproveConfirm = async () => {
    setConfirmApprove((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/.netlify/functions/admin-payment-mark-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ref: externalReference }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'No se pudo aprobar el pago');
      }
      toast.success(
        'Pago aprobado',
        body.emailSent
          ? `Se envió el acceso a ${body.to}.`
          : 'Pago aprobado. El email no se pudo enviar automáticamente — reintentá con Reenviar acceso.'
      );
      setConfirmApprove({ open: false, loading: false });
      fetchPayment();
    } catch (err) {
      console.error('[PagoDetalle] approve error:', err);
      toast.error('No se pudo aprobar', err.message);
      setConfirmApprove((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado al portapapeles', label);
    } catch {
      toast.error('No se pudo copiar', 'Copiá manualmente el texto');
    }
  };

  if (loading) {
    return (
      <>
        <Link to="/admin/pagos" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al listado
        </Link>
        <PageHeader title="Detalle del pago" subtitle="Cargando..." />
        <LoadingState message="Cargando pago..." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Link to="/admin/pagos" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al listado
        </Link>
        <PageHeader title="Detalle del pago" subtitle="No pudimos cargar el pago." />
        <ErrorState
          title="Pago no encontrado"
          message={error}
          action={{ label: 'Volver al listado', onClick: () => navigate('/admin/pagos') }}
        />
      </>
    );
  }

  if (!payment) return null;

  const canResend = payment.status === 'approved' && payment.buyerEmail;
  // Sprint 2.8: cualquier pago pending con email puede aprobarse manualmente.
  // Para MP es un fallback si el webhook no llegó todavía.
  const canApprove =
    payment.status === 'pending' &&
    !!payment.buyerEmail;

  return (
    <>
      <Link to="/admin/pagos" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Volver al listado
      </Link>

      <PageHeader
        title="Detalle del pago"
        subtitle={payment.externalReference}
        actions={
          <div className={styles.actionsRow}>
            {canApprove && (
              <button
                type="button"
                onClick={() => setConfirmApprove({ open: true, loading: false })}
                className={styles.primaryBtn}
                title="Confirmar que recibiste el pago y enviar el acceso al comprador"
              >
                <CheckCircle size={16} aria-hidden="true" />
                Marcar como aprobado
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmResend({ open: true, loading: false })}
              disabled={!canResend}
              className={canApprove ? styles.secondaryBtn : styles.primaryBtn}
              title={
                !canResend
                  ? payment.status !== 'approved'
                    ? 'Solo disponible para pagos aprobados'
                    : 'El pago no tiene email asociado'
                  : 'Reenviar email de acceso al comprador'
              }
            >
              <Mail size={16} aria-hidden="true" />
              Reenviar acceso
            </button>
          </div>
        }
      />

      <div className={styles.grid}>
        {/* Bloque 1: Resumen */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Resumen</h2>
          <dl className={styles.dl}>
            <div className={styles.dlRow}>
              <dt>Estado</dt>
              <dd>
                <Badge variant={statusVariant[payment.status] || 'neutral'}>
                  {statusLabel[payment.status] || payment.status}
                </Badge>
              </dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Monto</dt>
              <dd className={styles.amount}>
                {formatCurrency(payment.amount, payment.currency)}
              </dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Email del comprador</dt>
              <dd>{payment.buyerEmail || '—'}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Curso</dt>
              <dd>{payment.productTitle || payment.cursoSlug}</dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Slug</dt>
              <dd>
                <code className={styles.code}>{payment.cursoSlug}</code>
              </dd>
            </div>
          </dl>
        </section>

        {/* Bloque 2: Timeline */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Cronología</h2>
          <ol className={styles.timeline}>
            <li className={styles.timelineItem}>
              <div className={styles.timelineDot} aria-hidden="true" />
              <div>
                <p className={styles.timelineLabel}>Iniciado</p>
                <p className={styles.timelineDate}>{formatDateTime(payment.createdAt)}</p>
              </div>
            </li>
            {payment.approvedAt && (
              <li className={styles.timelineItem}>
                <div className={`${styles.timelineDot} ${styles.timelineDot_success}`} aria-hidden="true" />
                <div>
                  <p className={styles.timelineLabel}>Aprobado</p>
                  <p className={styles.timelineDate}>{formatDateTime(payment.approvedAt)}</p>
                </div>
              </li>
            )}
            {payment.emailSentAt && (
              <li className={styles.timelineItem}>
                <div className={`${styles.timelineDot} ${styles.timelineDot_success}`} aria-hidden="true" />
                <div>
                  <p className={styles.timelineLabel}>Email de acceso enviado</p>
                  <p className={styles.timelineDate}>{formatDateTime(payment.emailSentAt)}</p>
                  {payment.emailId && (
                    <p className={styles.timelineHint}>ID: <code>{payment.emailId}</code></p>
                  )}
                </div>
              </li>
            )}
            {payment.resentEmailAt && (
              <li className={styles.timelineItem}>
                <div className={`${styles.timelineDot} ${styles.timelineDot_success}`} aria-hidden="true" />
                <div>
                  <p className={styles.timelineLabel}>Email reenviado manualmente</p>
                  <p className={styles.timelineDate}>{formatDateTime(payment.resentEmailAt)}</p>
                  {payment.resentEmailBy && (
                    <p className={styles.timelineHint}>Por: {payment.resentEmailBy}</p>
                  )}
                </div>
              </li>
            )}
            <li className={styles.timelineItem}>
              <div className={styles.timelineDot} aria-hidden="true" />
              <div>
                <p className={styles.timelineLabel}>Última actualización</p>
                <p className={styles.timelineDate}>{formatDateTime(payment.updatedAt)}</p>
              </div>
            </li>
          </ol>
        </section>

        {/* Bloque 3: Referencias técnicas */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Referencias</h2>
          <dl className={styles.dl}>
            <div className={styles.dlRow}>
              <dt>Referencia externa</dt>
              <dd className={styles.dlActionable}>
                <code className={styles.code}>{payment.externalReference}</code>
                <button
                  type="button"
                  onClick={() => handleCopy(payment.externalReference, 'Referencia externa')}
                  className={styles.iconAction}
                  aria-label="Copiar referencia externa"
                >
                  <Copy size={14} aria-hidden="true" />
                </button>
              </dd>
            </div>
            <div className={styles.dlRow}>
              <dt>Provider</dt>
              <dd>{payment.provider || 'mercadopago'}</dd>
            </div>
            {payment.providerReference && (
              <div className={styles.dlRow}>
                <dt>Referencia del provider</dt>
                <dd className={styles.dlActionable}>
                  <code className={styles.code}>{payment.providerReference}</code>
                  <button
                    type="button"
                    onClick={() => handleCopy(payment.providerReference, 'Referencia del provider')}
                    className={styles.iconAction}
                    aria-label="Copiar referencia del provider"
                  >
                    <Copy size={14} aria-hidden="true" />
                  </button>
                </dd>
              </div>
            )}
            {payment.mpPaymentId && (
              <div className={styles.dlRow}>
                <dt>ID de pago en MP</dt>
                <dd>
                  <code className={styles.code}>{payment.mpPaymentId}</code>
                </dd>
              </div>
            )}
            {payment.mpStatus && (
              <div className={styles.dlRow}>
                <dt>Estado en MP</dt>
                <dd>
                  <code className={styles.code}>{payment.mpStatus}</code>
                  {payment.mpStatusDetail && (
                    <span className={styles.hint}> ({payment.mpStatusDetail})</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Bloque 4: Link de acceso */}
        {accessUrl && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Link de acceso</h2>
          <p className={styles.hint}>
            Este es el link que recibió el comprador. Podés copiarlo o abrirlo para verificarlo.
          </p>
          <div className={styles.accessUrl}>
            <code className={styles.codeLong}>{accessUrl}</code>
            <div className={styles.accessActions}>
              <button
                type="button"
                onClick={() => handleCopy(accessUrl, 'Link de acceso')}
                className={styles.iconAction}
                aria-label="Copiar link"
              >
                <Copy size={14} aria-hidden="true" />
                Copiar
              </button>
              <a
                href={accessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.iconAction}
              >
                <ExternalLink size={14} aria-hidden="true" />
                Abrir
              </a>
            </div>
          </div>
        </section>
        )}

        {/* Bloque 5: Metadata cruda (colapsable) */}
        {payment.providerMetadata && (
          <section className={`${styles.card} ${styles.cardWide}`}>
            <details>
              <summary className={styles.detailsSummary}>
                Metadata del provider (avanzado)
              </summary>
              <pre className={styles.pre}>
                {JSON.stringify(payment.providerMetadata, null, 2)}
              </pre>
            </details>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirmResend.open}
        title="¿Reenviar email de acceso?"
        message={`Se va a enviar el link de acceso a ${payment.buyerEmail}. Es útil cuando el comprador perdió el email original.`}
        confirmLabel="Sí, reenviar"
        loading={confirmResend.loading}
        onConfirm={handleResendConfirm}
        onCancel={() => setConfirmResend({ open: false, loading: false })}
      />
      <ConfirmDialog
        open={confirmApprove.open}
        title="¿Marcar este pago como aprobado?"
        message={
          payment.provider === 'mercadopago'
            ? `Vas a marcar como aprobado este pago de MercadoPago (${payment.buyerEmail}) sin esperar la confirmación automática del webhook. Usá esta opción solo si ya viste el pago en tu cuenta MP. Al confirmar, se envía automáticamente el link de acceso al comprador.`
            : `Vas a confirmar que recibiste el pago por ${payment.provider === 'transferencia' ? 'transferencia bancaria' : 'Go Cuotas'} del comprador ${payment.buyerEmail}. Al confirmar, se le va a enviar automáticamente el link de acceso al curso.`
        }
        confirmLabel="Sí, aprobar y enviar acceso"
        loading={confirmApprove.loading}
        onConfirm={handleApproveConfirm}
        onCancel={() => setConfirmApprove({ open: false, loading: false })}
      />

      <Toast {...toast.props} />
    </>
  );
}

export default PagoDetalle;