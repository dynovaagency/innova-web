/**
 * POST /.netlify/functions/admin-certificate-download
 *
 * Descarga el certificado de cualquier pago para verificación admin.
 * Protegido con requireAdmin (cookie de sesión del panel).
 *
 * Body: { ref: string }  // externalReference
 *
 * Response:
 *   200 application/pdf con el archivo binario
 *   404 si el pago no existe o no tiene certificado
 */

import { error, preflight } from './_lib/config.js';
import { requireAdmin } from './_lib/auth/middleware.js';
import * as paymentsRepo from './_lib/repositories/payments.js';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'certificates';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  const auth = await requireAdmin(event);
  if (auth.error) return auth.response;

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { ref } = payload;
  if (!ref) return error(400, 'ref es requerido');

  try {
    const payment = await paymentsRepo.findByReference(ref);
    if (!payment) return error(404, 'Pago no encontrado');
    if (!payment.certificateUrl) {
      return error(404, 'Este pago no tiene certificado asociado');
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(payment.certificateUrl);

    if (downloadError || !data) {
      console.error('[admin-certificate-download] storage error:', downloadError);
      return error(500, 'No pudimos obtener el certificado');
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-${ref}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('[admin-certificate-download] error:', err);
    return error(500, 'No pudimos descargar el certificado', {
      details: err.message,
    });
  }
};