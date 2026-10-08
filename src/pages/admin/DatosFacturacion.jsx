import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileKey, Save, Star, Upload } from 'lucide-react';
import { adminFetch } from '../../lib/adminFetch.js';
import { isValidCuitCuil, normalizeCuitCuil } from '../../lib/validators.js';
import Badge from '../../components/admin/Badge.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import styles from './DatosFacturacion.module.css';

/**
 * Datos de facturación del admin logueado (Configuración).
 *
 * Cada admin que vaya a emitir facturas carga acá, por su cuenta:
 *   1. Sus datos fiscales.
 *   2. Su certificado digital de ARCA (pedido → ARCA → subir .crt).
 *
 * También se elige el emisor por defecto: el que factura los productos
 * que no tienen un emisor asignado.
 *
 * Props:
 *   toast: instancia de useToast del padre.
 */

const CONDICIONES = [
  { value: 'monotributo', label: 'Monotributo' },
  { value: 'responsable_inscripto', label: 'Responsable inscripto' },
  { value: 'exento', label: 'IVA exento' },
];

const emptyForm = {
  razonSocial: '',
  cuit: '',
  condicionFiscal: 'monotributo',
  puntoVenta: '',
  domicilioFiscal: '',
  inicioActividades: '',
};

const formatCuit = (cuit) =>
  cuit && cuit.length === 11 ? `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}` : cuit || '';

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const parseValidation = (list) => {
  const out = {};
  (list || []).forEach((msg) => {
    const [field, ...rest] = String(msg).split(':');
    out[field.trim()] = rest.join(':').trim() || msg;
  });
  return out;
};

function DatosFacturacion({ toast }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [emisor, setEmisor] = useState(null);
  const [emisores, setEmisores] = useState([]);
  const [arcaEnv, setArcaEnv] = useState('homologacion');
  const [encryptionConfigured, setEncryptionConfigured] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [certBusy, setCertBusy] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [defaultBusy, setDefaultBusy] = useState(null);

  const fileInputRef = useRef(null);

  const applyEmisor = (e) => {
    setEmisor(e);
    if (e) {
      setForm({
        razonSocial: e.razonSocial || '',
        cuit: formatCuit(e.cuit),
        condicionFiscal: e.condicionFiscal || 'monotributo',
        puntoVenta: e.puntoVenta ? String(e.puntoVenta) : '',
        domicilioFiscal: e.domicilioFiscal || '',
        inicioActividades: e.inicioActividades || '',
      });
    }
  };

  const fetchEmisores = useCallback(async () => {
    const res = await adminFetch('/.netlify/functions/admin-emisores-list');
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    setEmisores(data.emisores || []);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminFetch('/.netlify/functions/admin-fiscal-profile');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setArcaEnv(data.arcaEnv || 'homologacion');
      setEncryptionConfigured(data.encryptionConfigured !== false);
      if (data.emisor) {
        applyEmisor(data.emisor);
      } else {
        setForm({
          ...emptyForm,
          razonSocial: data.prefill?.razonSocial || '',
          cuit: formatCuit(data.prefill?.cuit || ''),
        });
      }
      await fetchEmisores();
    } catch (err) {
      console.error('[DatosFacturacion] fetch error:', err);
      setLoadError('No pudimos cargar tus datos de facturación.');
    } finally {
      setLoading(false);
    }
  }, [fetchEmisores]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (form.razonSocial.trim().length < 3) errors.razonSocial = 'Ingresá el nombre o razón social.';
    if (!isValidCuitCuil(form.cuit)) errors.cuit = 'El CUIT no es válido.';
    if (form.puntoVenta) {
      const n = Number(form.puntoVenta);
      if (!Number.isInteger(n) || n < 1 || n > 99998) {
        errors.puntoVenta = 'Tiene que ser un número entre 1 y 99998.';
      }
    }
    return errors;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      const res = await adminFetch('/.netlify/functions/admin-fiscal-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cuit: normalizeCuitCuil(form.cuit),
          puntoVenta: form.puntoVenta ? Number(form.puntoVenta) : null,
          inicioActividades: form.inicioActividades || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.validation) setFieldErrors(parseValidation(body.validation));
        throw new Error(body.error || 'No se pudieron guardar los datos');
      }
      applyEmisor(body.emisor);
      await fetchEmisores();
      toast.success(
        'Datos guardados',
        body.certificateReset
          ? 'Cambiaste el CUIT o el nombre: tenés que generar un certificado nuevo.'
          : 'Tus datos de facturación se actualizaron.'
      );
    } catch (err) {
      console.error('[DatosFacturacion] save error:', err);
      toast.error('No se pudo guardar', err.message);
    } finally {
      setSaving(false);
    }
  };

  const certificateAction = async (payload, successTitle, successMessage) => {
    setCertBusy(true);
    try {
      const res = await adminFetch('/.netlify/functions/admin-fiscal-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'No se pudo completar la operación');
      applyEmisor(body.emisor);
      await fetchEmisores();
      toast.success(successTitle, successMessage);
      return body.emisor;
    } catch (err) {
      console.error('[DatosFacturacion] certificate error:', err);
      toast.error('Hubo un problema', err.message);
      return null;
    } finally {
      setCertBusy(false);
    }
  };

  const downloadCsr = (csrPem, cuit) => {
    const blob = new Blob([csrPem], { type: 'application/pkcs10' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `innova-${cuit}.csr`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    setConfirmRegenerate(false);
    const updated = await certificateAction(
      { action: 'generate-csr' },
      'Pedido generado',
      'Se descargó el archivo .csr. Subilo a ARCA siguiendo los pasos.'
    );
    if (updated?.csrPem) downloadCsr(updated.csrPem, updated.cuit);
  };

  const handleGenerateClick = () => {
    if (emisor?.hasCsr) setConfirmRegenerate(true);
    else handleGenerate();
  };

  const handleCertFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20000) {
      toast.error('Archivo incorrecto', 'Ese archivo es demasiado grande para ser un certificado.');
      return;
    }
    const certPem = await file.text();
    await certificateAction(
      { action: 'upload-cert', certPem },
      'Certificado cargado',
      'Ya quedó asociado a tu cuenta.'
    );
  };

  const handleSetDefault = async (id) => {
    setDefaultBusy(id);
    try {
      const res = await adminFetch('/.netlify/functions/admin-emisor-set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'No se pudo cambiar el emisor por defecto');
      await fetchEmisores();
      if (emisor) setEmisor((prev) => ({ ...prev, isDefault: prev.id === id }));
      toast.success('Emisor por defecto actualizado', `${body.emisor.razonSocial} factura los productos sin emisor asignado.`);
    } catch (err) {
      console.error('[DatosFacturacion] default error:', err);
      toast.error('Hubo un problema', err.message);
    } finally {
      setDefaultBusy(null);
    }
  };

  if (loading) {
    return (
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Datos de facturación</h2>
        <p className={styles.muted}>Cargando…</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Datos de facturación</h2>
        <p className={styles.muted}>{loadError}</p>
        <button type="button" className={styles.secondaryBtn} onClick={fetchAll}>
          Reintentar
        </button>
      </section>
    );
  }

  const isHomologacion = arcaEnv !== 'produccion';

  return (
    <>
      {/* ---------- 1. Datos fiscales ---------- */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.sectionTitle}>Datos de facturación</h2>
          {emisor ? (
            emisor.ready ? (
              <Badge variant="success">Listo para facturar</Badge>
            ) : (
              <Badge variant="warning">Incompleto</Badge>
            )
          ) : (
            <Badge variant="neutral">Sin cargar</Badge>
          )}
        </div>

        <p className={styles.intro}>
          Completá esta sección solo si vas a emitir facturas a tu nombre por las ventas
          de la plataforma. Los datos tienen que coincidir con los que figuran en ARCA.
        </p>

        {emisor && !emisor.ready && emisor.missing?.length > 0 && (
          <div className={styles.missing}>
            <strong>Para poder facturar te falta:</strong>
            <ul>
              {emisor.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSave} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="fiscal-razon" className={styles.label}>
              Nombre o razón social <span className={styles.required}>*</span>
            </label>
            <input
              id="fiscal-razon"
              type="text"
              value={form.razonSocial}
              onChange={handleChange('razonSocial')}
              className={fieldErrors.razonSocial ? styles.inputError : styles.input}
              disabled={saving}
              placeholder="Como figura en tu constancia de inscripción"
            />
            {fieldErrors.razonSocial && <span className={styles.errorText}>{fieldErrors.razonSocial}</span>}
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="fiscal-cuit" className={styles.label}>
                CUIT <span className={styles.required}>*</span>
              </label>
              <input
                id="fiscal-cuit"
                type="text"
                inputMode="numeric"
                value={form.cuit}
                onChange={handleChange('cuit')}
                className={fieldErrors.cuit ? styles.inputError : styles.input}
                disabled={saving}
                placeholder="20-12345678-9"
              />
              {fieldErrors.cuit && <span className={styles.errorText}>{fieldErrors.cuit}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="fiscal-condicion" className={styles.label}>
                Condición fiscal <span className={styles.required}>*</span>
              </label>
              <select
                id="fiscal-condicion"
                value={form.condicionFiscal}
                onChange={handleChange('condicionFiscal')}
                className={styles.input}
                disabled={saving}
              >
                {CONDICIONES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {fieldErrors.condicionFiscal && <span className={styles.errorText}>{fieldErrors.condicionFiscal}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="fiscal-domicilio" className={styles.label}>Domicilio fiscal</label>
            <input
              id="fiscal-domicilio"
              type="text"
              value={form.domicilioFiscal}
              onChange={handleChange('domicilioFiscal')}
              className={styles.input}
              disabled={saving}
              placeholder="Calle 123, Localidad, Provincia"
            />
            <span className={styles.hint}>Sale impreso en cada factura.</span>
          </div>

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="fiscal-inicio" className={styles.label}>Inicio de actividades</label>
              <input
                id="fiscal-inicio"
                type="date"
                value={form.inicioActividades}
                onChange={handleChange('inicioActividades')}
                className={fieldErrors.inicioActividades ? styles.inputError : styles.input}
                disabled={saving}
              />
              {fieldErrors.inicioActividades && <span className={styles.errorText}>{fieldErrors.inicioActividades}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="fiscal-pv" className={styles.label}>Punto de venta</label>
              <input
                id="fiscal-pv"
                type="number"
                min="1"
                max="99998"
                value={form.puntoVenta}
                onChange={handleChange('puntoVenta')}
                className={fieldErrors.puntoVenta ? styles.inputError : styles.input}
                disabled={saving}
                placeholder="Ej: 3"
              />
              <span className={styles.hint}>
                Tiene que ser un punto de venta de tipo Web Services, creado en ARCA para esta plataforma.
              </span>
              {fieldErrors.puntoVenta && <span className={styles.errorText}>{fieldErrors.puntoVenta}</span>}
            </div>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn} disabled={saving}>
              <Save size={16} aria-hidden="true" />
              {saving ? 'Guardando…' : 'Guardar datos'}
            </button>
          </div>
        </form>
      </section>

      {/* ---------- 2. Certificado digital ---------- */}
      {emisor && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>Certificado digital de ARCA</h2>
            {emisor.hasCert ? (
              <Badge variant="success">Vigente hasta {formatDate(emisor.certExpiresAt)}</Badge>
            ) : emisor.hasCsr ? (
              <Badge variant="warning">Falta subir el certificado</Badge>
            ) : (
              <Badge variant="neutral">Sin generar</Badge>
            )}
          </div>

          <p className={styles.intro}>
            El certificado es lo que autoriza a la plataforma a emitir facturas a tu nombre.
            Se hace una sola vez y dura aproximadamente dos años.
            {isHomologacion && ' Este ambiente es de prueba: el certificado se tramita en el entorno de homologación de ARCA.'}
          </p>

          {!encryptionConfigured && (
            <div className={styles.missing}>
              La facturación todavía no está habilitada en este ambiente. Avisale a Dynova.
            </div>
          )}

          <ol className={styles.steps}>
            <li className={styles.step}>
              <div className={styles.stepBody}>
                <strong>Generá el pedido de certificado</strong>
                <p>Se descarga un archivo <code>.csr</code> con tu CUIT.</p>
                <div className={styles.stepActions}>
                  <button
                    type="button"
                    className={emisor.hasCsr ? styles.secondaryBtn : styles.primaryBtn}
                    onClick={handleGenerateClick}
                    disabled={certBusy || !encryptionConfigured}
                  >
                    <FileKey size={16} aria-hidden="true" />
                    {emisor.hasCsr ? 'Generar un pedido nuevo' : 'Generar pedido'}
                  </button>
                  {emisor.hasCsr && emisor.csrPem && (
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => downloadCsr(emisor.csrPem, emisor.cuit)}
                      disabled={certBusy}
                    >
                      <Download size={16} aria-hidden="true" />
                      Volver a descargar el .csr
                    </button>
                  )}
                </div>
                {emisor.hasCsr && (
                  <span className={styles.hint}>Pedido generado el {formatDate(emisor.csrGeneratedAt)}.</span>
                )}
              </div>
            </li>

            <li className={styles.step}>
              <div className={styles.stepBody}>
                <strong>Subí el pedido a ARCA y descargá el certificado</strong>
                {isHomologacion ? (
                  <ul>
                    <li>Entrá a ARCA con tu clave fiscal y abrí el servicio <em>WSASS – Autogestión Certificados Homologación</em>.</li>
                    <li>En <em>Nuevo certificado</em>, poné un nombre (por ejemplo <code>innovaweb</code>), pegá el contenido del <code>.csr</code> y creá el certificado.</li>
                    <li>Copiá el resultado en un archivo <code>.crt</code>.</li>
                    <li>En <em>Crear autorización a servicio</em>, autorizá ese certificado para el servicio <code>wsfe</code>.</li>
                  </ul>
                ) : (
                  <ul>
                    <li>Entrá a ARCA con tu clave fiscal y abrí <em>Administración de Certificados Digitales</em>.</li>
                    <li>Elegí <em>Agregar alias</em>, poné un nombre (por ejemplo <code>innovaweb</code>), subí el archivo <code>.csr</code> y descargá el <code>.crt</code>.</li>
                    <li>En <em>Administrador de Relaciones de Clave Fiscal</em>, creá una nueva relación para el servicio <em>Facturación Electrónica</em> (dentro de WebServices) y elegí como representante el alias que creaste.</li>
                    <li>En <em>Administración de puntos de venta y domicilios</em>, creá un punto de venta de tipo Web Services y cargá el número más arriba.</li>
                  </ul>
                )}
                <span className={styles.hint}>
                  Si algún servicio no te aparece, se agrega desde “Administrador de Relaciones de Clave Fiscal”. Tu contador puede ayudarte con estos pasos.
                </span>
              </div>
            </li>

            <li className={styles.step}>
              <div className={styles.stepBody}>
                <strong>Subí el certificado acá</strong>
                <p>Es el archivo <code>.crt</code> que te dio ARCA.</p>
                <div className={styles.stepActions}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".crt,.pem,.cer,application/x-x509-ca-cert,application/x-pem-file"
                    onChange={handleCertFile}
                    className={styles.fileInput}
                    aria-label="Archivo del certificado"
                  />
                  <button
                    type="button"
                    className={emisor.hasCsr && !emisor.hasCert ? styles.primaryBtn : styles.secondaryBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={certBusy || !emisor.hasCsr}
                  >
                    <Upload size={16} aria-hidden="true" />
                    {emisor.hasCert ? 'Reemplazar certificado' : 'Subir certificado'}
                  </button>
                </div>
                {emisor.hasCert && (
                  <span className={styles.hint}>
                    Cargado el {formatDate(emisor.certUploadedAt)}. Vence el {formatDate(emisor.certExpiresAt)}.
                  </span>
                )}
              </div>
            </li>
          </ol>
        </section>
      )}

      {/* ---------- 3. Emisor por defecto ---------- */}
      {emisores.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Quién factura</h2>
          <p className={styles.intro}>
            Cada cápsula o curso puede tener asignado quién lo factura. Los que no tengan
            a nadie asignado se facturan a nombre del emisor por defecto.
          </p>

          <ul className={styles.emisores}>
            {emisores.map((e) => (
              <li key={e.id} className={styles.emisorRow}>
                <div className={styles.emisorInfo}>
                  <span className={styles.emisorName}>{e.razonSocial}</span>
                  <span className={styles.emisorMeta}>CUIT {formatCuit(e.cuit)}</span>
                </div>
                <div className={styles.emisorActions}>
                  {e.ready ? (
                    <Badge variant="success">Listo</Badge>
                  ) : (
                    <Badge variant="warning">Incompleto</Badge>
                  )}
                  {e.isDefault ? (
                    <Badge variant="neutral">Por defecto</Badge>
                  ) : (
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => handleSetDefault(e.id)}
                      disabled={defaultBusy !== null}
                    >
                      <Star size={14} aria-hidden="true" />
                      {defaultBusy === e.id ? 'Guardando…' : 'Usar por defecto'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmRegenerate}
        title="¿Generar un pedido nuevo?"
        message={
          emisor?.hasCert
            ? 'El certificado que tenés cargado deja de servir y la plataforma no va a poder facturar a tu nombre hasta que subas el nuevo.'
            : 'El pedido anterior deja de servir. Si ya lo subiste a ARCA, vas a tener que repetir ese paso con el archivo nuevo.'
        }
        confirmLabel="Generar pedido nuevo"
        variant="danger"
        loading={certBusy}
        onConfirm={handleGenerate}
        onCancel={() => setConfirmRegenerate(false)}
      />
    </>
  );
}

export default DatosFacturacion;
