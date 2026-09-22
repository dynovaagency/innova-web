import { useState, useRef } from 'react';
import { Award, Upload, Download, RefreshCw, CheckCircle } from 'lucide-react';
import styles from './CertificateSection.module.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Sección "Certificado" en el detalle del pago admin.
 *
 * Permite subir/reemplazar el certificado del alumno. Al subirlo:
 *   - Se guarda en Supabase Storage (bucket privado).
 *   - Se dispara mail automático al alumno con el PDF adjunto.
 *   - Aparece en el panel del alumno como "Descargar certificado".
 *
 * Props:
 *   payment: el pago (necesita externalReference, status, certificateUrl,
 *            certificateUploadedAt, certificateUploadedBy)
 *   onSuccess: callback tras upload exitoso (para refetch del pago)
 */
function CertificateSection({ payment, onSuccess }) {
  const [file, setFile] = useState(null);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const fileInputRef = useRef(null);

  const hasCertificate = !!payment.certificateUrl;
  const canUpload = payment.status === 'approved' && !!payment.buyerEmail;

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validaciones frontend
    if (selected.type !== 'application/pdf') {
      setError('El archivo debe ser un PDF.');
      e.target.value = '';
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('El archivo excede el tamaño máximo permitido (10 MB).');
      e.target.value = '';
      return;
    }

    setFile(selected);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Seleccioná un archivo PDF primero.');
      return;
    }

    // Si ya hay certificado y no se confirmó reemplazo, pedir confirmación
    if (hasCertificate && !showReplaceConfirm) {
      setShowReplaceConfirm(true);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setShowReplaceConfirm(false);

    try {
    const formData = new FormData();
      formData.append('ref', payment.externalReference);
      formData.append('file', file);
      if (comment.trim()) formData.append('comment', comment.trim());

      // El panel admin autentica con cookie de sesión (sistema actual).
      // No seteamos Content-Type: el navegador arma el boundary de multipart.
      const res = await fetch('/.netlify/functions/admin-upload-certificate', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }

      const msg = data.replaced
        ? 'Certificado reemplazado. Se envió el mail actualizado al alumno.'
        : data.emailSent
          ? 'Certificado subido. Se envió el mail al alumno.'
          : 'Certificado subido, pero no pudimos enviar el email. Verificá el log.';

      setSuccess(msg);
      setFile(null);
      setComment('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.();
    } catch (err) {
      console.error('[CertificateSection] error:', err);
      setError(err.message || 'No pudimos subir el certificado.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    setError(null);
    try {
        const res = await fetch('/.netlify/functions/admin-certificate-download', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: payment.externalReference }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificado-${payment.externalReference}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[CertificateSection] download error:', err);
      setError(err.message || 'No pudimos descargar el certificado.');
    }
  };

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Award size={18} aria-hidden="true" />
          <h2>Certificado</h2>
        </div>
        {hasCertificate && (
          <span className={styles.badgeSuccess}>
            <CheckCircle size={14} aria-hidden="true" />
            Cargado
          </span>
        )}
      </header>

      {!canUpload && (
        <p className={styles.warning}>
          El certificado solo puede cargarse en pagos aprobados con email del comprador.
        </p>
      )}

      {hasCertificate && (
        <div className={styles.currentCertificate}>
          <div className={styles.currentInfo}>
            <p className={styles.currentLabel}>Cargado el</p>
            <p className={styles.currentValue}>{formatDate(payment.certificateUploadedAt)}</p>
          </div>
          {payment.certificateUploadedBy && (
            <div className={styles.currentInfo}>
              <p className={styles.currentLabel}>Por</p>
              <p className={styles.currentValue}>{payment.certificateUploadedBy}</p>
            </div>
          )}
          {payment.certificateEmailSentAt && (
            <div className={styles.currentInfo}>
              <p className={styles.currentLabel}>Email enviado al alumno</p>
              <p className={styles.currentValue}>{formatDate(payment.certificateEmailSentAt)}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className={styles.downloadBtn}
          >
            <Download size={16} aria-hidden="true" />
            Descargar certificado actual
          </button>
        </div>
      )}

      {canUpload && (
        <div className={styles.uploadArea}>
          <h3 className={styles.uploadTitle}>
            {hasCertificate ? 'Reemplazar certificado' : 'Subir certificado'}
          </h3>
          <p className={styles.uploadHelp}>
            {hasCertificate
              ? 'Al reemplazarlo, se enviará un mail al alumno con la nueva versión.'
              : 'Al subirlo, se enviará automáticamente al alumno por email y quedará disponible en su panel.'}
          </p>

          <label htmlFor="certificate-file" className={styles.fileLabel}>
            <Upload size={16} aria-hidden="true" />
            {file ? file.name : 'Seleccionar archivo PDF'}
          </label>
          <input
            ref={fileInputRef}
            id="certificate-file"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className={styles.fileInput}
            disabled={uploading}
          />

          <label htmlFor="certificate-comment" className={styles.commentLabel}>
            Comentario para el alumno (opcional)
          </label>
          <textarea
            id="certificate-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={styles.commentInput}
            placeholder="Ej: Felicitaciones por completar el curso..."
            rows={3}
            disabled={uploading}
            maxLength={500}
          />

          {error && (
            <p className={styles.errorMsg} role="alert">{error}</p>
          )}

          {success && (
            <p className={styles.successMsg} role="status">
              <CheckCircle size={14} aria-hidden="true" />
              {success}
            </p>
          )}

          {showReplaceConfirm && (
            <div className={styles.confirmBox}>
              <p className={styles.confirmText}>
                ¿Reemplazar el certificado actual? Se enviará un nuevo mail al alumno.
              </p>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  onClick={() => setShowReplaceConfirm(false)}
                  className={styles.cancelBtn}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className={styles.confirmBtn}
                >
                  Sí, reemplazar
                </button>
              </div>
            </div>
          )}

          {!showReplaceConfirm && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || uploading}
              className={styles.uploadBtn}
            >
              {uploading ? (
                <>
                  <RefreshCw size={16} className={styles.spinIcon} aria-hidden="true" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload size={16} aria-hidden="true" />
                  {hasCertificate ? 'Reemplazar' : 'Subir certificado'}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default CertificateSection;