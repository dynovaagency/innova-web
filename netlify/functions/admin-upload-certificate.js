/**
 * POST /.netlify/functions/admin-upload-certificate
 *
 * Sube el certificado de un alumno para un pago aprobado.
 * Protegido con requireAdmin.
 *
 * Body (multipart/form-data):
 *   - ref: externalReference del pago
 *   - file: PDF del certificado
 *   - comment: comentario opcional para el email al alumno
 *
 * Flow:
 *   1. Valida que el pago exista, esté aprobado y tenga email.
 *   2. Sube el PDF al bucket 'certificates' con path {externalReference}.pdf
 *      (si ya existía, lo reemplaza).
 *   3. Actualiza el pago con certificate_url, certificate_uploaded_at,
 *      certificate_uploaded_by.
 *   4. Dispara email al alumno con el PDF adjunto.
 *
 * Response:
 *   200 { uploaded: true, emailSent: boolean, replaced: boolean }
 *   400 { error: 'Pago no aprobado' | 'Archivo inválido' }
 *   404 { error: 'Pago no encontrado' }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import { sendCertificateEmail } from './_lib/email.js';
import { resolveProductTitle } from './_lib/products/title-resolver.js';
import { createClient } from '@supabase/supabase-js';
import busboy from 'busboy';

const BUCKET = 'certificates';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Parsea multipart/form-data usando busboy.
 * Netlify Functions no tiene parser nativo para multipart.
 */
function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return reject(new Error('Content-Type must be multipart/form-data'));
    }

    const bb = busboy({ headers: { 'content-type': contentType } });
    const fields = {};
    let fileBuffer = null;
    let fileName = null;
    let fileMimeType = null;
    let fileTooLarge = false;

    bb.on('field', (name, value) => {
      fields[name] = value;
    });

    bb.on('file', (name, file, info) => {
      fileName = info.filename;
      fileMimeType = info.mimeType;
      const chunks = [];
      let totalSize = 0;

      file.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          fileTooLarge = true;
          file.resume(); // drain
          return;
        }
        chunks.push(chunk);
      });

      file.on('end', () => {
        if (!fileTooLarge) {
          fileBuffer = Buffer.concat(chunks);
        }
      });
    });

    bb.on('finish', () => {
      if (fileTooLarge) return reject(new Error('FILE_TOO_LARGE'));
      resolve({ fields, fileBuffer, fileName, fileMimeType });
    });

    bb.on('error', reject);

    // El body de Netlify llega como base64 si es binario
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '', 'binary');
    bb.end(body);
  });
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  let parsed;
  try {
    parsed = await parseMultipart(event);
  } catch (err) {
    if (err.message === 'FILE_TOO_LARGE') {
      return error(400, 'El archivo excede el tamaño máximo permitido (10 MB)');
    }
    console.error('[admin-upload-certificate] parse error:', err);
    return error(400, 'No pudimos procesar el archivo. Asegurate de enviar un PDF válido.');
  }

  const { fields, fileBuffer, fileMimeType } = parsed;
  const ref = fields.ref;
  const comment = fields.comment || '';

  if (!ref) return error(400, 'ref es requerido');
  if (!fileBuffer) return error(400, 'file es requerido');
  if (fileMimeType !== 'application/pdf') {
    return error(400, 'El archivo debe ser un PDF');
  }

  try {
    const payment = await paymentsRepo.findByReference(ref);
    if (!payment) return error(404, 'Pago no encontrado');
    if (payment.status !== 'approved') {
      return error(400, 'Solo se pueden cargar certificados en pagos aprobados', {
        currentStatus: payment.status,
      });
    }
    if (!payment.buyerEmail) {
      return error(400, 'El pago no tiene email asociado');
    }

    // Subir a Supabase Storage (upsert: true reemplaza si ya existe)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const storagePath = `${ref}.pdf`;
    const wasReplaced = !!payment.certificateUrl;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[admin-upload-certificate] storage error:', uploadError);
      return error(500, 'No pudimos subir el certificado', {
        details: uploadError.message,
      });
    }

    const now = new Date().toISOString();

    // Actualizar el pago con la info del certificado
    await paymentsRepo.updateStatus(ref, {
      certificateUrl: storagePath,
      certificateUploadedAt: now,
      certificateUploadedBy: auth.admin.email,
      certificateComment: comment.trim() || null,
    });

    console.log('[admin-upload-certificate] certificado subido:', {
      ref,
      admin: auth.admin.email,
      replaced: wasReplaced,
    });

    // Enviar email al alumno con el certificado adjunto
    const cursoTitle = await resolveProductTitle(payment);
    const emailResult = await sendCertificateEmail({
      to: payment.buyerEmail,
      cursoTitle,
      comment: comment.trim() || null,
      pdfAttachment: {
        filename: `certificado-${ref}.pdf`,
        content: fileBuffer,
      },
      isReplacement: wasReplaced,
    });

    if (emailResult.sent) {
      await paymentsRepo.updateStatus(ref, {
        certificateEmailSentAt: new Date().toISOString(),
        certificateEmailId: emailResult.id || null,
      });
    } else {
      console.warn('[admin-upload-certificate] email no enviado:', emailResult.error);
    }

    return ok({
      uploaded: true,
      replaced: wasReplaced,
      emailSent: emailResult.sent,
      emailId: emailResult.id || null,
      to: payment.buyerEmail,
    });
  } catch (err) {
    console.error('[admin-upload-certificate] error:', err);
    return error(500, 'No pudimos procesar el certificado', {
      details: err.message,
    });
  }
};