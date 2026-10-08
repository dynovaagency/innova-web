/**
 * POST /.netlify/functions/admin-fiscal-certificate
 *
 * Gestión del certificado digital de ARCA del admin logueado.
 * Protegido con requireAdmin. Cada admin solo opera sobre SU emisor.
 *
 * Body: { action: 'generate-csr' }
 *   Genera una clave privada nueva y el pedido de certificado (CSR).
 *   La clave se guarda cifrada y nunca sale del backend. Si ya había
 *   un certificado cargado, se descarta (deja de corresponder a la clave).
 *   Response: { emisor }   (emisor.csrPem trae el pedido para descargar)
 *
 * Body: { action: 'upload-cert', certPem: string }
 *   Guarda el .crt que devolvió ARCA. Se valida que corresponda a la
 *   clave privada guardada y al CUIT del emisor, y que no esté vencido.
 *   Response: { emisor }
 */

import { ok, error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import {
  decryptSecret,
  encryptSecret,
  findEmisorByUsuario,
  generateKeyAndCsr,
  getSupabase,
  inspectCertificate,
  isEncryptionConfigured,
  toApiEmisor,
} from './_lib/fiscal.js';

const MAX_CERT_LENGTH = 20000;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  if (!isEncryptionConfigured()) {
    console.error('[admin-fiscal-certificate] falta FISCAL_ENCRYPTION_KEY');
    return error(503, 'La facturación todavía no está habilitada en este ambiente. Avisale a Dynova.');
  }

  try {
    const emisor = await findEmisorByUsuario(auth.admin.id);
    if (!emisor) {
      return error(400, 'Primero guardá tus datos de facturación');
    }

    const supabase = getSupabase();

    if (body.action === 'generate-csr') {
      const { privateKeyPem, csrPem } = generateKeyAndCsr({
        cuit: emisor.cuit,
        razonSocial: emisor.razon_social,
      });

      const { data, error: updateError } = await supabase
        .from('emisores')
        .update({
          private_key_enc: encryptSecret(privateKeyPem),
          csr_pem: csrPem,
          csr_generated_at: new Date().toISOString(),
          cert_pem: null,
          cert_expires_at: null,
          cert_uploaded_at: null,
        })
        .eq('id', emisor.id)
        .select()
        .single();
      if (updateError) throw updateError;

      console.log('[admin-fiscal-certificate] CSR generado', {
        admin: auth.admin.email,
        cuit: emisor.cuit,
        replacedCert: Boolean(emisor.cert_pem),
      });
      return ok({ emisor: toApiEmisor(data, { includeCsr: true }) });
    }

    if (body.action === 'upload-cert') {
      const certPem = String(body.certPem || '').trim();
      if (!certPem) return error(400, 'Falta el certificado');
      if (certPem.length > MAX_CERT_LENGTH) return error(400, 'El archivo es demasiado grande para ser un certificado');
      if (!emisor.private_key_enc) {
        return error(400, 'Primero generá el pedido de certificado');
      }

      const result = inspectCertificate({
        certPem,
        privateKeyPem: decryptSecret(emisor.private_key_enc),
        cuit: emisor.cuit,
      });
      if (!result.valid) return error(400, result.reason);

      const { data, error: updateError } = await supabase
        .from('emisores')
        .update({
          cert_pem: certPem,
          cert_expires_at: result.expiresAt,
          cert_uploaded_at: new Date().toISOString(),
        })
        .eq('id', emisor.id)
        .select()
        .single();
      if (updateError) throw updateError;

      console.log('[admin-fiscal-certificate] certificado cargado', {
        admin: auth.admin.email,
        cuit: emisor.cuit,
        expiresAt: result.expiresAt,
      });
      return ok({ emisor: toApiEmisor(data, { includeCsr: true }) });
    }

    return error(400, "action debe ser 'generate-csr' o 'upload-cert'");
  } catch (err) {
    console.error('[admin-fiscal-certificate] error:', err);
    return error(500, 'No se pudo procesar el certificado', { details: err.message });
  }
};
