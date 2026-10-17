import { adminFetch } from '../../lib/adminFetch.js';
import { useCallback, useEffect, useState } from 'react';
import { FileText, RefreshCw, Send, XCircle, Ban, AlertTriangle } from 'lucide-react';
import Badge from '../../components/admin/Badge.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/format.js';
import styles from './FacturaSection.module.css';

/**
 * Sección "Factura electrónica" en el detalle del pago admin.
 *
 * Según el estado de la factura del pago:
 *   - Sin factura   → elegir emisor y "Facturar ahora".
 *   - Pendiente     → cambiar emisor, "Emitir ahora" o "No facturar".
 *   - Emitiendo     → aviso y botón para actualizar.
 *   - Error         → motivo, cambiar emisor, "Reintentar ahora".
 *   - Emitida       → datos del comprobante y "Anular" (nota de crédito),
 *                     con opción de emitir una factura nueva.
 * Abajo, el historial: facturas anuladas y notas de crédito.
 *
 * Props:
 *   payment: el pago (externalReference, status, amount, currency)
 *   toast:   el toast de la página (useToast)
 */

const estadoVariant = {
  pendiente: 'warning',
  emitiendo: 'warning',
  emitida: 'success',
  error: 'danger',
  anulada: 'neutral',
};

const estadoLabel = {
  pendiente: 'Pendiente',
  emitiendo: 'Emitiendo',
  emitida: 'Emitida',
  error: 'Error',
  anulada: 'Anulada',
};

const MAX_AUTO_RETRIES = 3;

// Las fechas de comprobante vienen como 'YYYY-MM-DD'. new Date() las toma
// como medianoche UTC y en Argentina mostraría el día anterior.
const formatDay = (day) => (day ? formatDate(`${day}T12:00:00-03:00`) : '—');

const formatCuit = (cuit) =>
  cuit && cuit.length === 11 ? `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}` : cuit || '—';

const emisorOptionLabel = (e) =>
  `${e.razonSocial} (${formatCuit(e.cuit)})${e.isDefault ? ' · por defecto' : ''}${e.ready ? '' : ' · incompleto'}`;

function EmisorSelect({ id, value, onChange, emisores, disabled }) {
  return (
    <select
      id={id}
      className={styles.select}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {!value && <option value="">Elegí un emisor…</option>}
      {emisores.map((e) => (
        <option key={e.id} value={e.id}>
          {emisorOptionLabel(e)}
        </option>
      ))}
    </select>
  );
}

function FacturaSection({ payment, toast }) {
  const ref = payment.externalReference;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // { title, message, confirmLabel, variant, body }

  const [emisorDraft, setEmisorDraft] = useState('');
  const [cancelPanel, setCancelPanel] = useState({ open: false, refacturar: true, emisorId: '' });

  const fetchFacturas = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await adminFetch(
        `/.netlify/functions/admin-payment-invoices?ref=${encodeURIComponent(ref)}`
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setData(body);
    } catch (err) {
      console.error('[FacturaSection] fetch error:', err);
      setLoadError(err.message || 'No se pudieron cargar las facturas');
    } finally {
      setLoading(false);
    }
  }, [ref]);

  useEffect(() => {
    fetchFacturas();
  }, [fetchFacturas]);

  const facturas = data?.facturas || [];
  const emisores = data?.emisores || [];
  const config = data?.config || null;
  const vigente = facturas.find((f) => f.tipo === 'factura' && f.estado !== 'anulada') || null;
  const historial = facturas.filter((f) => f !== vigente);
  const defaultEmisor = emisores.find((e) => e.isDefault) || null;

  // Al cargar (o cambiar la factura vigente), el selector arranca en el
  // emisor actual de la factura, o en el por defecto si no hay factura.
  useEffect(() => {
    setEmisorDraft(vigente?.emisorId || defaultEmisor?.id || '');
  }, [vigente?.id, vigente?.emisorId, defaultEmisor?.id]);

  const runAction = async (body) => {
    setBusy(true);
    try {
      const res = await adminFetch('/.netlify/functions/admin-invoice-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, ...body }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || `Error ${res.status}`);

      if (result.facturas) setData((prev) => ({ ...prev, facturas: result.facturas }));
      if (result.ok) {
        toast.success('Listo', result.message);
      } else {
        toast.error('No se pudo emitir', result.message);
      }
      setCancelPanel({ open: false, refacturar: true, emisorId: '' });
    } catch (err) {
      console.error('[FacturaSection] action error:', err);
      toast.error('No se pudo completar la acción', err.message);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const ask = (options) => setConfirm(options);

  // ---------------------------------------------------------------
  // Render de cada estado
  // ---------------------------------------------------------------

  const renderSinFactura = () => {
    if (payment.status !== 'approved') {
      return <p className={styles.muted}>Se factura cuando el pago esté aprobado.</p>;
    }
    if (!(Number(payment.amount) > 0)) {
      return <p className={styles.muted}>Este pago no tiene monto, así que no se factura.</p>;
    }
    if (emisores.length === 0) {
      return (
        <p className={styles.warning}>
          No hay emisores cargados. Cada persona que factura tiene que completar sus datos en
          Configuración → Datos de facturación.
        </p>
      );
    }
    const anulada = historial.some((f) => f.tipo === 'factura' && f.estado === 'anulada');
    return (
      <>
        <p className={styles.muted}>
          {anulada
            ? 'La factura anterior se anuló. Podés emitir una nueva.'
            : 'Este pago no tiene factura. Puede ser anterior a la fecha de inicio de la facturación o haberse descartado.'}
        </p>
        <div className={styles.field}>
          <label htmlFor="factura-emisor-nueva" className={styles.label}>
            Factura a nombre de
          </label>
          <EmisorSelect
            id="factura-emisor-nueva"
            value={emisorDraft}
            onChange={setEmisorDraft}
            emisores={emisores}
            disabled={busy}
          />
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={busy || !emisorDraft}
            onClick={() =>
              ask({
                title: '¿Emitir la factura ahora?',
                message: `Se va a emitir en ARCA una factura por ${formatCurrency(payment.amount, payment.currency)} a nombre de ${emisores.find((e) => e.id === emisorDraft)?.razonSocial}.`,
                confirmLabel: 'Sí, facturar',
                body: { action: 'create', emisorId: emisorDraft },
              })
            }
          >
            <Send size={16} aria-hidden="true" />
            Facturar ahora
          </button>
        </div>
      </>
    );
  };

  const renderEmisorEditable = (factura) => {
    const changed = emisorDraft && emisorDraft !== factura.emisorId;
    return (
      <div className={styles.field}>
        <label htmlFor="factura-emisor" className={styles.label}>
          Factura a nombre de
        </label>
        <div className={styles.inline}>
          <EmisorSelect
            id="factura-emisor"
            value={emisorDraft}
            onChange={setEmisorDraft}
            emisores={emisores}
            disabled={busy}
          />
          {changed && (
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={busy}
              onClick={() => runAction({ action: 'set_emisor', facturaId: factura.id, emisorId: emisorDraft })}
            >
              Guardar
            </button>
          )}
        </div>
        {(() => {
          const actual = emisores.find((e) => e.id === (changed ? emisorDraft : factura.emisorId));
          return actual && !actual.ready ? (
            <p className={styles.fieldHint}>
              A {actual.razonSocial} le falta: {actual.missing.join(', ')}. Hasta completarlo, la emisión va a fallar.
            </p>
          ) : null;
        })()}
      </div>
    );
  };

  const renderNoFacturarBtn = (factura) => (
    <button
      type="button"
      className={styles.linkBtn}
      disabled={busy}
      onClick={() =>
        ask({
          title: '¿No facturar este pago?',
          message:
            'Se descarta la factura programada y este pago queda sin facturar. Si después necesitás facturarlo, podés hacerlo desde acá.',
          confirmLabel: 'Sí, no facturar',
          variant: 'danger',
          body: { action: 'discard', facturaId: factura.id },
        })
      }
    >
      <Ban size={14} aria-hidden="true" />
      No facturar
    </button>
  );

  const renderPendiente = (factura) => (
    <>
      <p className={styles.muted}>
        {config?.enabled
          ? `Hasta que se emita podés cambiar a nombre de quién sale. Emisión automática: ${formatDateTime(factura.programadaPara)}`
          : 'La facturación automática está apagada: emitila a mano cuando corresponda.'}
      </p>
      {renderEmisorEditable(factura)}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={busy || Boolean(emisorDraft && emisorDraft !== factura.emisorId)}
          title={emisorDraft && emisorDraft !== factura.emisorId ? 'Guardá el cambio de emisor primero' : undefined}
          onClick={() =>
            ask({
              title: '¿Emitir la factura ahora?',
              message: `Se va a emitir en ARCA sin esperar el margen, por ${formatCurrency(factura.importe, payment.currency)}.`,
              confirmLabel: 'Sí, emitir',
              body: { action: 'emit_now', facturaId: factura.id },
            })
          }
        >
          <Send size={16} aria-hidden="true" />
          Emitir ahora
        </button>
        {renderNoFacturarBtn(factura)}
      </div>
    </>
  );

  const renderError = (factura) => {
    const autoRetry = config?.enabled && factura.intentos < MAX_AUTO_RETRIES;
    return (
      <>
        <div className={styles.errorBox}>
          <AlertTriangle size={16} aria-hidden="true" />
          <div>
            <p className={styles.errorTitle}>No se pudo emitir</p>
            <p className={styles.errorText}>{factura.errorMessage || 'Sin detalle.'}</p>
            <p className={styles.errorMeta}>
              Intentos: {factura.intentos}.{' '}
              {autoRetry
                ? 'Se vuelve a intentar sola dentro de la próxima hora.'
                : 'Ya no se reintenta sola: corregí el problema y reintentá a mano.'}
            </p>
          </div>
        </div>
        {!factura.numero && renderEmisorEditable(factura)}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={busy || Boolean(!factura.numero && emisorDraft && emisorDraft !== factura.emisorId)}
            onClick={() => runAction({ action: 'emit_now', facturaId: factura.id })}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Reintentar ahora
          </button>
          {!factura.numero && renderNoFacturarBtn(factura)}
        </div>
      </>
    );
  };

  const renderComprobante = (factura) => (
    <dl className={styles.dl}>
      <div className={styles.dlRow}>
        <dt>Comprobante</dt>
        <dd>
          {factura.cbteLabel} <code className={styles.code}>{factura.numeroFormateado}</code>
        </dd>
      </div>
      <div className={styles.dlRow}>
        <dt>Emisor</dt>
        <dd>
          {factura.emisor?.razonSocial || '—'}{' '}
          <span className={styles.muted}>CUIT {formatCuit(factura.emisor?.cuit)}</span>
        </dd>
      </div>
      <div className={styles.dlRow}>
        <dt>Fecha</dt>
        <dd>{formatDay(factura.fecha)}</dd>
      </div>
      <div className={styles.dlRow}>
        <dt>Importe</dt>
        <dd>
          {formatCurrency(factura.importe, payment.currency)}
          {factura.importeIva !== null && (
            <span className={styles.muted}>
              {' '}
              (neto {formatCurrency(factura.importeNeto, payment.currency)} + IVA{' '}
              {formatCurrency(factura.importeIva, payment.currency)})
            </span>
          )}
        </dd>
      </div>
      <div className={styles.dlRow}>
        <dt>Receptor</dt>
        <dd>
          {factura.receptor.docTipo === 99
            ? 'Consumidor final'
            : `${factura.receptor.docTipoLabel} ${formatCuit(factura.receptor.docNro)}`}
          {factura.receptor.nombre && <span className={styles.muted}> · {factura.receptor.nombre}</span>}
        </dd>
      </div>
      <div className={styles.dlRow}>
        <dt>CAE</dt>
        <dd>
          <code className={styles.code}>{factura.cae}</code>
          <span className={styles.muted}> vence {formatDay(factura.caeVto)}</span>
        </dd>
      </div>
    </dl>
  );

  const renderEmitida = (factura) => (
    <>
      {renderComprobante(factura)}
      {!cancelPanel.open ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.dangerBtn}
            disabled={busy}
            onClick={() =>
              setCancelPanel({ open: true, refacturar: true, emisorId: factura.emisorId || '' })
            }
          >
            <XCircle size={16} aria-hidden="true" />
            Anular factura
          </button>
        </div>
      ) : (
        <div className={styles.cancelPanel}>
          <p className={styles.cancelTitle}>Anular con nota de crédito</p>
          <p className={styles.muted}>
            Se emite una nota de crédito de {factura.emisor?.razonSocial} por el mismo importe. Es la
            forma correcta de anular una factura en ARCA.
          </p>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={cancelPanel.refacturar}
              onChange={(e) => setCancelPanel((p) => ({ ...p, refacturar: e.target.checked }))}
              disabled={busy}
            />
            Después, emitir una factura nueva
          </label>
          {cancelPanel.refacturar && (
            <div className={styles.field}>
              <label htmlFor="factura-emisor-refacturar" className={styles.label}>
                Factura nueva a nombre de
              </label>
              <EmisorSelect
                id="factura-emisor-refacturar"
                value={cancelPanel.emisorId}
                onChange={(id) => setCancelPanel((p) => ({ ...p, emisorId: id }))}
                emisores={emisores}
                disabled={busy}
              />
            </div>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.dangerBtn}
              disabled={busy || (cancelPanel.refacturar && !cancelPanel.emisorId)}
              onClick={() => {
                const nuevo = emisores.find((e) => e.id === cancelPanel.emisorId);
                ask({
                  title: cancelPanel.refacturar ? '¿Anular y refacturar?' : '¿Anular la factura?',
                  message: cancelPanel.refacturar
                    ? `Se emite la nota de crédito que anula la ${factura.cbteLabel} ${factura.numeroFormateado} y después una factura nueva a nombre de ${nuevo?.razonSocial}. Las dos quedan registradas en ARCA.`
                    : `Se emite la nota de crédito que anula la ${factura.cbteLabel} ${factura.numeroFormateado}. Queda registrada en ARCA y el pago queda sin factura.`,
                  confirmLabel: cancelPanel.refacturar ? 'Sí, anular y refacturar' : 'Sí, anular',
                  variant: 'danger',
                  body: {
                    action: 'cancel',
                    facturaId: factura.id,
                    refacturar: cancelPanel.refacturar,
                    emisorId: cancelPanel.refacturar ? cancelPanel.emisorId : undefined,
                  },
                });
              }}
            >
              {cancelPanel.refacturar ? 'Anular y refacturar' : 'Anular'}
            </button>
            <button
              type="button"
              className={styles.linkBtn}
              disabled={busy}
              onClick={() => setCancelPanel({ open: false, refacturar: true, emisorId: '' })}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );

  const renderVigente = (factura) => {
    switch (factura.estado) {
      case 'pendiente':
        return renderPendiente(factura);
      case 'emitiendo':
        return (
          <div className={styles.actions}>
            <p className={styles.muted}>Se está emitiendo en este momento.</p>
            <button type="button" className={styles.secondaryBtn} onClick={fetchFacturas} disabled={busy}>
              <RefreshCw size={14} aria-hidden="true" />
              Actualizar
            </button>
          </div>
        );
      case 'error':
        return renderError(factura);
      case 'emitida':
        return renderEmitida(factura);
      default:
        return null;
    }
  };

  const renderHistorial = () => {
    if (historial.length === 0) return null;
    return (
      <div className={styles.history}>
        <p className={styles.historyTitle}>Historial</p>
        <ul className={styles.historyList}>
          {historial.map((f) => (
            <li key={f.id} className={styles.historyItem}>
              <div className={styles.historyMain}>
                <span>
                  {f.cbteLabel || (f.tipo === 'nota_credito' ? 'Nota de crédito' : 'Factura')}{' '}
                  {f.numeroFormateado && <code className={styles.code}>{f.numeroFormateado}</code>}
                </span>
                <Badge variant={estadoVariant[f.estado] || 'neutral'}>{estadoLabel[f.estado] || f.estado}</Badge>
              </div>
              <p className={styles.historyMeta}>
                {f.emisor?.razonSocial || 'Sin emisor'} · {formatCurrency(f.importe, payment.currency)}
                {f.fecha ? ` · ${formatDay(f.fecha)}` : ` · creada ${formatDateTime(f.createdAt)}`}
                {f.cae ? ` · CAE ${f.cae}` : ''}
              </p>
              {f.estado === 'error' && (
                <div className={styles.historyError}>
                  <p className={styles.errorText}>{f.errorMessage}</p>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={busy}
                    onClick={() => runAction({ action: 'emit_now', facturaId: f.id })}
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    Reintentar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // ---------------------------------------------------------------

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <FileText size={20} aria-hidden="true" />
          <h2>Factura electrónica</h2>
        </div>
        <div className={styles.headerBadges}>
          {config?.env === 'homologacion' && (
            <span className={styles.envTag} title="Los comprobantes de homologación no tienen validez fiscal">
              Modo prueba (homologación)
            </span>
          )}
          {vigente && (
            <Badge variant={estadoVariant[vigente.estado] || 'neutral'}>
              {estadoLabel[vigente.estado] || vigente.estado}
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <p className={styles.muted}>Cargando factura…</p>
      ) : loadError ? (
        <div className={styles.actions}>
          <p className={styles.warning}>{loadError}</p>
          <button type="button" className={styles.secondaryBtn} onClick={fetchFacturas}>
            <RefreshCw size={14} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {vigente ? renderVigente(vigente) : renderSinFactura()}
          {renderHistorial()}
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        variant={confirm?.variant || 'default'}
        loading={busy}
        onConfirm={() => runAction(confirm.body)}
        onCancel={() => setConfirm(null)}
      />
    </section>
  );
}

export default FacturaSection;